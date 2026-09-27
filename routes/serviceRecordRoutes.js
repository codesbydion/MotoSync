const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const Vehicle = require("../models/Vehicle");
const ServiceType = require("../models/ServiceType");
const ServiceRecord = require("../models/ServiceRecord");
const ServiceProvider = require("../models/ServiceProvider");
const MaintenanceAlert = require("../models/MaintenanceAlert");
const mongoose = require("mongoose");

const pickValue = (value, keys = []) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object") return value;

  for (const key of keys) {
    const candidate = value[key];
    if (candidate === undefined || candidate === null) continue;

    if (typeof candidate === "object") {
      const nested = pickValue(candidate, keys);
      if (nested !== undefined && nested !== null && String(nested).trim() !== "") {
        return nested;
      }
      continue;
    }

    if (String(candidate).trim() !== "") {
      return candidate;
    }
  }

  return undefined;
};

const toObjectId = (value) => {
  const rawValue = pickValue(value, ["_id", "id", "value"]);
  if (!rawValue) return undefined;
  return String(rawValue).trim();
};

const toNumberOrUndefined = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeText = (text) => String(text || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const OBJECT_ID_REGEX = /\b[a-fA-F0-9]{24}\b/;

const tryParseJson = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
};

const resolveServiceTypeId = async (value) => {
  if (value === undefined || value === null || value === "") return undefined;

  const parsed = tryParseJson(value);
  if (parsed) {
    return resolveServiceTypeId(parsed);
  }

  const rawFromObject = pickValue(value, ["_id", "id", "value", "name", "label"]);
  if (rawFromObject && mongoose.Types.ObjectId.isValid(String(rawFromObject))) {
    return String(rawFromObject);
  }

  const raw = String(rawFromObject ?? value).trim();
  if (!raw) return undefined;

  const idInsideRaw = raw.match(OBJECT_ID_REGEX)?.[0];
  if (idInsideRaw && mongoose.Types.ObjectId.isValid(idInsideRaw)) {
    return idInsideRaw;
  }

  if (mongoose.Types.ObjectId.isValid(raw)) {
    return raw;
  }

  const byExactName = await ServiceType.findOne({ name: new RegExp(`^${escapeRegex(raw)}$`, "i") }).select("_id");
  if (byExactName) return String(byExactName._id);

  const spacedPattern = escapeRegex(raw).replace(/\s+/g, "\\s+");
  const byLooseSpace = await ServiceType.findOne({ name: new RegExp(`^${spacedPattern}$`, "i") }).select("_id");
  if (byLooseSpace) return String(byLooseSpace._id);

  const normalizedRaw = normalizeText(raw);
  const allTypes = await ServiceType.find().select("_id name").lean();
  const byNormalized = allTypes.find((t) => normalizeText(t.name) === normalizedRaw);
  if (byNormalized) return String(byNormalized._id);

  const byContains = allTypes.find((t) => {
    const normalizedName = normalizeText(t.name);
    return normalizedName.includes(normalizedRaw) || normalizedRaw.includes(normalizedName);
  });
  if (byContains) return String(byContains._id);

  return null;
};

const extractServiceTypeName = (value) => {
  if (value === undefined || value === null || value === "") return undefined;

  const parsed = tryParseJson(value);
  if (parsed) return extractServiceTypeName(parsed);

  const rawFromObject = pickValue(value, ["name", "label", "text", "value"]);
  const raw = String(rawFromObject ?? value).trim();
  if (!raw) return undefined;
  if (mongoose.Types.ObjectId.isValid(raw)) return undefined;

  const idInsideRaw = raw.match(OBJECT_ID_REGEX)?.[0];
  if (idInsideRaw && raw.length === idInsideRaw.length) return undefined;

  return raw;
};

const resolveVehicleId = async (value, userId) => {
  if (value === undefined || value === null || value === "") return undefined;

  const rawFromObject = pickValue(value, ["_id", "id", "value", "registrationNo", "label", "name"]);
  if (rawFromObject && mongoose.Types.ObjectId.isValid(String(rawFromObject))) {
    return String(rawFromObject);
  }

  const raw = String(rawFromObject ?? value).trim();
  if (!raw) return undefined;

  if (mongoose.Types.ObjectId.isValid(raw)) {
    return raw;
  }

  const regInBrackets = raw.match(/\(([^)]+)\)\s*$/);
  const registrationNo = (regInBrackets ? regInBrackets[1] : raw).trim().toUpperCase();

  const byReg = await Vehicle.findOne({
    user: userId,
    registrationNo: new RegExp(`^${escapeRegex(registrationNo)}$`, "i")
  }).select("_id");

  return byReg ? String(byReg._id) : null;
};

const resolveProviderId = async (value) => {
  if (value === undefined || value === null || value === "") return undefined;

  const parsed = tryParseJson(value);
  if (parsed) {
    return resolveProviderId(parsed);
  }

  const rawFromObject = pickValue(value, ["_id", "id", "value", "providerName", "name", "label"]);
  if (rawFromObject && mongoose.Types.ObjectId.isValid(String(rawFromObject))) {
    return String(rawFromObject);
  }

  const raw = String(rawFromObject ?? value).trim();
  if (!raw) return undefined;

  const idInsideRaw = raw.match(OBJECT_ID_REGEX)?.[0];
  if (idInsideRaw && mongoose.Types.ObjectId.isValid(idInsideRaw)) {
    return idInsideRaw;
  }

  if (mongoose.Types.ObjectId.isValid(raw)) {
    return raw;
  }

  const byName = await ServiceProvider.findOne({
    providerName: new RegExp(`^${escapeRegex(raw)}$`, "i")
  }).select("_id");

  if (byName) return String(byName._id);

  const normalizedRaw = normalizeText(raw);
  const allProviders = await ServiceProvider.find().select("_id providerName").lean();
  const byNormalized = allProviders.find((p) => normalizeText(p.providerName) === normalizedRaw);
  if (byNormalized) return String(byNormalized._id);

  const byContains = allProviders.find((p) => {
    const normalizedName = normalizeText(p.providerName);
    return normalizedName.includes(normalizedRaw) || normalizedRaw.includes(normalizedName);
  });
  if (byContains) return String(byContains._id);

  return null;
};

const extractProviderName = (value) => {
  if (value === undefined || value === null || value === "") return undefined;

  const parsed = tryParseJson(value);
  if (parsed) return extractProviderName(parsed);

  const rawFromObject = pickValue(value, ["providerName", "name", "label", "text", "value"]);
  const raw = String(rawFromObject ?? value).trim();
  if (!raw) return undefined;
  if (mongoose.Types.ObjectId.isValid(raw)) return undefined;

  const idInsideRaw = raw.match(OBJECT_ID_REGEX)?.[0];
  if (idInsideRaw && raw.length === idInsideRaw.length) return undefined;

  return raw;
};

router.get("/", authMiddleware, async (req, res) => {
  try {
    const records = await ServiceRecord.find({ user: req.user._id })
      .populate("vehicle", "brand model registrationNo")
      .populate("serviceType", "name dueDays dueMileage")
      .populate("provider", "providerName contactNo email")
      .sort({ serviceDate: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch service records" });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const record = await ServiceRecord.findOne({
      _id: req.params.id,
      user: req.user._id
    })
      .populate("vehicle", "brand model registrationNo")
      .populate("serviceType", "name dueDays dueMileage")
      .populate("provider", "providerName contactNo email");

    if (!record) return res.status(404).json({ message: "Service record not found" });
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch service record" });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const vehicleId = await resolveVehicleId(req.body.vehicleId ?? req.body.vehicle, req.user._id);
    let serviceTypeId = await resolveServiceTypeId(req.body.serviceTypeId ?? req.body.serviceType);
    const providerId = await resolveProviderId(req.body.providerId ?? req.body.provider);
    const serviceDate = req.body.serviceDate ?? req.body.date;
    const remarks = req.body.remarks;
    const totalCost = toNumberOrUndefined(req.body.totalCost ?? req.body.cost ?? req.body.amount ?? req.body.price);
    const mileageAtService = toNumberOrUndefined(req.body.mileageAtService ?? req.body.mileage);

    if (vehicleId === undefined || serviceTypeId === undefined || totalCost === undefined) {
      return res.status(400).json({ message: "vehicleId, serviceTypeId and totalCost are required" });
    }
    if (vehicleId === null) {
      return res.status(400).json({ message: "Invalid vehicleId (use a valid id or your vehicle registration number)" });
    }
    if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(400).json({ message: "Invalid vehicleId" });
    }
    if (serviceTypeId === null) {
      const candidateName = extractServiceTypeName(req.body.serviceTypeId ?? req.body.serviceType);
      if (candidateName && /[a-zA-Z]/.test(candidateName)) {
        const createdType = await ServiceType.findOneAndUpdate(
          { name: new RegExp(`^${escapeRegex(candidateName)}$`, "i") },
          { $setOnInsert: { name: candidateName } },
          { new: true, upsert: true }
        ).select("_id");
        serviceTypeId = createdType ? String(createdType._id) : null;
      }
    }
    if (serviceTypeId === null) {
      return res.status(400).json({ message: "Invalid serviceTypeId (use a valid id or existing service type name)" });
    }
    if (!mongoose.Types.ObjectId.isValid(serviceTypeId)) {
      return res.status(400).json({ message: "Invalid serviceTypeId" });
    }
    let finalProviderId = providerId;
    if (finalProviderId === null) {
      const providerName = extractProviderName(req.body.providerId ?? req.body.provider);
      if (providerName && /[a-zA-Z]/.test(providerName)) {
        const createdProvider = await ServiceProvider.findOneAndUpdate(
          { providerName: new RegExp(`^${escapeRegex(providerName)}$`, "i") },
          { $setOnInsert: { providerName } },
          { new: true, upsert: true }
        ).select("_id");
        finalProviderId = createdProvider ? String(createdProvider._id) : null;
      }
    }
    if (finalProviderId === null) {
      return res.status(400).json({ message: "Invalid providerId (use a valid id or existing provider name)" });
    }
    if (finalProviderId && !mongoose.Types.ObjectId.isValid(finalProviderId)) {
      return res.status(400).json({ message: "Invalid providerId" });
    }
    if (Number.isNaN(totalCost)) {
      return res.status(400).json({ message: "totalCost must be a valid number" });
    }
    if (Number.isNaN(mileageAtService)) {
      return res.status(400).json({ message: "mileageAtService must be a valid number" });
    }

    const vehicle = await Vehicle.findOne({ _id: vehicleId, user: req.user._id });
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    const serviceType = await ServiceType.findById(serviceTypeId);
    if (!serviceType) return res.status(404).json({ message: "Service type not found" });

    if (finalProviderId) {
      const provider = await ServiceProvider.findById(finalProviderId);
      if (!provider) return res.status(404).json({ message: "Service provider not found" });
    }

    const record = await ServiceRecord.create({
      user: req.user._id,
      vehicle: vehicleId,
      serviceType: serviceTypeId,
      provider: finalProviderId || undefined,
      serviceDate: serviceDate || new Date(),
      totalCost,
      remarks,
      mileageAtService
    });

    if (typeof mileageAtService === "number" && mileageAtService > vehicle.mileage) {
      vehicle.mileage = mileageAtService;
      await vehicle.save();
    }

    await MaintenanceAlert.updateMany(
      { vehicle: vehicleId, serviceType: serviceTypeId, status: "open" },
      { status: "resolved" }
    );

    const dueDate = serviceType.dueDays
      ? new Date(new Date(record.serviceDate).getTime() + serviceType.dueDays * 24 * 60 * 60 * 1000)
      : undefined;

    const dueMileage =
      serviceType.dueMileage && typeof mileageAtService === "number"
        ? mileageAtService + serviceType.dueMileage
        : undefined;

    if (dueDate || dueMileage) {
      await MaintenanceAlert.create({
        vehicle: vehicleId,
        serviceType: serviceTypeId,
        dueDate,
        dueMileage
      });
    }

    res.status(201).json(record);
  } catch (error) {
    console.error("Create service record failed:", {
      message: error.message,
      body: req.body
    });
    res.status(500).json({ message: "Failed to create service record" });
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const serviceDate = req.body.serviceDate ?? req.body.date;
    const remarks = req.body.remarks;
    let providerId = await resolveProviderId(req.body.providerId ?? req.body.provider);
    const totalCost = toNumberOrUndefined(req.body.totalCost ?? req.body.cost ?? req.body.amount ?? req.body.price);
    const mileageAtService = toNumberOrUndefined(req.body.mileageAtService ?? req.body.mileage);

    if (providerId === null) {
      const providerName = extractProviderName(req.body.providerId ?? req.body.provider);
      if (providerName && /[a-zA-Z]/.test(providerName)) {
        const createdProvider = await ServiceProvider.findOneAndUpdate(
          { providerName: new RegExp(`^${escapeRegex(providerName)}$`, "i") },
          { $setOnInsert: { providerName } },
          { new: true, upsert: true }
        ).select("_id");
        providerId = createdProvider ? String(createdProvider._id) : null;
      }
    }
    if (providerId === null) {
      return res.status(400).json({ message: "Invalid providerId (use a valid id or existing provider name)" });
    }
    if (providerId && !mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({ message: "Invalid providerId" });
    }
    if (totalCost !== undefined && Number.isNaN(totalCost)) {
      return res.status(400).json({ message: "totalCost must be a valid number" });
    }
    if (mileageAtService !== undefined && Number.isNaN(mileageAtService)) {
      return res.status(400).json({ message: "mileageAtService must be a valid number" });
    }

    if (providerId) {
      const provider = await ServiceProvider.findById(providerId);
      if (!provider) return res.status(404).json({ message: "Service provider not found" });
    }

    const updated = await ServiceRecord.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      {
        serviceDate,
        totalCost,
        remarks,
        mileageAtService,
        provider: providerId || undefined
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Service record not found" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update service record" });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await ServiceRecord.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!deleted) return res.status(404).json({ message: "Service record not found" });
    res.json({ message: "Service record deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete service record" });
  }
});

module.exports = router;
