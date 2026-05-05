const ApiError = require("../../common/ApiError");
const XLSX = require("xlsx");
const contactsRepository = require("./contacts.repository");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeString = (value) => {
  if (value === null || value === undefined) {
    return undefined;
  }
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
};

const toSafeFileNamePart = (value) => {
  return value.toISOString().slice(0, 10).replace(/-/g, "");
};

const getColumnValue = (row, keys) => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return row[key];
    }
  }
  return undefined;
};

const normalizeImportedContact = (row) => {
  const email = normalizeString(
    getColumnValue(row, ["email", "Email", "EMAIL"]),
  );

  return {
    email: email ? email.toLowerCase() : undefined,
    firstName: normalizeString(
      getColumnValue(row, [
        "firstName",
        "FirstName",
        "first_name",
        "first name",
      ]),
    ),
    lastName: normalizeString(
      getColumnValue(row, ["lastName", "LastName", "last_name", "last name"]),
    ),
    phone: normalizeString(getColumnValue(row, ["phone", "Phone"])),
    company: normalizeString(getColumnValue(row, ["company", "Company"])),
    city: normalizeString(getColumnValue(row, ["city", "City"])),
    country: normalizeString(getColumnValue(row, ["country", "Country"])),
    language: normalizeString(getColumnValue(row, ["language", "Language"])),
    emailStatus: normalizeString(
      getColumnValue(row, ["emailStatus", "EmailStatus", "email_status"]),
    ),
    source:
      normalizeString(getColumnValue(row, ["source", "Source"])) || "import",
  };
};

const parseContactsFromFile = (file) => {
  if (!file || !file.buffer) {
    throw new ApiError(
      400,
      "Missing upload file. Use multipart/form-data with field 'file'.",
    );
  }

  const workbook = XLSX.read(file.buffer, {
    type: "buffer",
    raw: false,
  });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: false,
  });
};

const listContacts = async (userId, filters) => {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;

  const result = await contactsRepository.listContacts(userId, {
    ...filters,
    page,
    pageSize,
  });

  return {
    items: result.rows,
    pagination: {
      page,
      pageSize,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
    },
  };
};

const getContactById = async (userId, contactId) => {
  const contact = await contactsRepository.findContactById(userId, contactId);
  if (!contact) {
    throw new ApiError(404, "Contact not found");
  }

  const [tags, customFields] = await Promise.all([
    contactsRepository.getContactTags(contactId),
    contactsRepository.listContactFieldValues(userId, contactId),
  ]);

  return {
    ...contact,
    tags,
    customFields,
  };
};

const createContact = async (userId, payload) => {
  return contactsRepository.createContact(userId, payload);
};

const importContacts = async (userId, { file, mode = "insert" }) => {
  const rows = parseContactsFromFile(file);

  if (rows.length === 0) {
    return {
      mode,
      totalRows: 0,
      inserted: 0,
      updated: 0,
      skippedDuplicates: 0,
      invalidRows: 0,
      errors: [],
    };
  }

  const normalizedRows = rows.map(normalizeImportedContact);
  const errors = [];
  const deduped = [];
  const seenEmails = new Set();

  normalizedRows.forEach((row, index) => {
    const rowNumber = index + 2;

    if (!row.email) {
      errors.push({ row: rowNumber, message: "Missing email" });
      return;
    }

    if (!EMAIL_REGEX.test(row.email)) {
      errors.push({ row: rowNumber, message: "Invalid email format" });
      return;
    }

    if (seenEmails.has(row.email)) {
      return;
    }

    seenEmails.add(row.email);
    deduped.push(row);
  });

  if (deduped.length === 0) {
    return {
      mode,
      totalRows: rows.length,
      inserted: 0,
      updated: 0,
      skippedDuplicates: 0,
      invalidRows: errors.length,
      errors,
    };
  }

  const result =
    mode === "upsert"
      ? await contactsRepository.bulkUpsertContacts(userId, deduped)
      : await contactsRepository.bulkInsertContacts(userId, deduped);

  return {
    mode,
    totalRows: rows.length,
    inserted: result.inserted,
    updated: result.updated,
    skippedDuplicates: result.skippedDuplicates,
    invalidRows: errors.length,
    errors,
  };
};

const exportContacts = async (userId, query) => {
  const format = query.format || "csv";
  const contacts = await contactsRepository.listContactsForExport(userId, {
    search: query.search,
    status: query.status,
    city: query.city,
  });

  const exportRows = contacts.map((item) => ({
    email: item.email || "",
    firstName: item.first_name || "",
    lastName: item.last_name || "",
    phone: item.phone || "",
    company: item.company || "",
    city: item.city || "",
    country: item.country || "",
    language: item.language || "",
    emailStatus: item.email_status || "",
    source: item.source || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Contacts");

  const isCsv = format === "csv";
  const bookType = isCsv ? "csv" : "xlsx";
  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType,
  });

  const datePart = toSafeFileNamePart(new Date());
  return {
    buffer,
    fileName: isCsv
      ? `contacts_export_${datePart}.csv`
      : `contacts_export_${datePart}.xlsx`,
    contentType: isCsv
      ? "text/csv; charset=utf-8"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    total: contacts.length,
  };
};

const updateContact = async (userId, contactId, payload) => {
  const updated = await contactsRepository.updateContact(
    userId,
    contactId,
    payload,
  );
  if (!updated) {
    throw new ApiError(404, "Contact not found");
  }
  return updated;
};

const deleteContact = async (userId, contactId) => {
  const removed = await contactsRepository.deleteContact(userId, contactId);
  if (!removed) {
    throw new ApiError(404, "Contact not found");
  }
  return { deleted: true };
};

const listTags = async (userId) => {
  return contactsRepository.listTags(userId);
};

const createTag = async (userId, payload) => {
  return contactsRepository.createTag(userId, payload);
};

const listTagRecipients = async (userId, tagId) => {
  const recipients = await contactsRepository.listTagRecipients(userId, tagId);
  if (recipients === null) {
    throw new ApiError(404, "Tag not found");
  }

  return {
    tagId,
    total: recipients.length,
    recipients,
  };
};

const listDynamicFields = async (userId) => {
  return contactsRepository.listDynamicFields(userId);
};

const createDynamicField = async (userId, payload) => {
  try {
    return await contactsRepository.createDynamicField(userId, payload);
  } catch (error) {
    if (error.message.includes("duplicate key value")) {
      throw new ApiError(409, "Field name already exists");
    }
    throw error;
  }
};

const updateDynamicField = async (userId, fieldId, payload) => {
  try {
    const updated = await contactsRepository.updateDynamicField(
      userId,
      fieldId,
      payload,
    );
    if (!updated) {
      throw new ApiError(404, "Dynamic field not found");
    }
    return updated;
  } catch (error) {
    if (error.message.includes("duplicate key value")) {
      throw new ApiError(409, "Field name already exists");
    }
    throw error;
  }
};

const deleteDynamicField = async (userId, fieldId) => {
  const removed = await contactsRepository.deleteDynamicField(userId, fieldId);
  if (!removed) {
    throw new ApiError(404, "Dynamic field not found");
  }
  return { deleted: true };
};

const replaceContactTags = async (userId, contactId, payload) => {
  const tags = await contactsRepository.replaceContactTags(
    userId,
    contactId,
    payload.tagIds,
  );
  if (!tags) {
    throw new ApiError(404, "Contact not found");
  }
  return tags;
};

const listContactFieldValues = async (userId, contactId) => {
  const values = await contactsRepository.listContactFieldValues(
    userId,
    contactId,
  );
  if (values === null) {
    throw new ApiError(404, "Contact not found");
  }
  return values;
};

const replaceContactFieldValues = async (userId, contactId, payload) => {
  const values = await contactsRepository.replaceContactFieldValues(
    userId,
    contactId,
    payload.values,
  );
  if (values === null) {
    throw new ApiError(404, "Contact not found");
  }
  return values;
};

module.exports = {
  listContacts,
  getContactById,
  createContact,
  importContacts,
  exportContacts,
  updateContact,
  deleteContact,
  listTags,
  createTag,
  listTagRecipients,
  listDynamicFields,
  createDynamicField,
  updateDynamicField,
  deleteDynamicField,
  replaceContactTags,
  listContactFieldValues,
  replaceContactFieldValues,
};
