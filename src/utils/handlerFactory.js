
const ApiError = require("./apiError");
const ApiFeatures = require("./apiFeatures");

function safeLocalize(Model, data, locale) {
  try {
    if (
      Model &&
      Model.schema &&
      Model.schema.methods &&
      typeof Model.schema.methods.toJSONLocalizedOnly === "function"
    ) {
      return Model.schema.methods.toJSONLocalizedOnly(data, locale);
    }
  } catch (e) {
    console.error("Localization method threw:", e);
  }
  if (Array.isArray(data))
    return data.map((d) => (d && d.toObject ? d.toObject() : d));
  return data && data.toObject ? data.toObject() : data;
}

// ---------------- updateOne ----------------
exports.updateOne = (Model) => async (req, res, next) => {
  try {
    const document = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!document) {
      return res
        .status(404)
        .json({ message: `No document for this id ${req.params.id}` });
    }

    return res
      .status(200)
      .json({ status: `updated successfully`, data: document });
  } catch (error) {
    console.error("Error updating document:", error);
    return next(error); // pass to centralized error handler
  }
};

// ---------------- createOne ----------------
exports.createOne = (Model) => async (req, res, next) => {
  try {
    const document = await Model.create(req.body);
    return res
      .status(201)
      .json({ status: `created successfully`, data: document });
  } catch (error) {
    console.error("Error creating document:", error);
    return next(error);
  }
};

// ---------------- getOne ----------------
exports.getOne = (Model, populationOpt) => async (req, res, next) => {
  try {
    const { id } = req.params;
    let query = Model.findById(id);

    const document = await query;

    if (!document) {
      return next(new ApiError(`No document For this id ${id}`, 404));
    }

    return res.status(200).json({ data: document });
  } catch (error) {
    console.error("Error fetching document:", error);
    return next(error);
  }
};

// ---------------- getAll ----------------
exports.getAll =
  (Model, modelName = "", populationOpt) =>
  async (req, res, next) => {
    try {
      let filter = {};
      filter = req.filterObj || req.filterObj;
      //compine between custom filter(req.filterObj) and req.query
      const excludesFields = ["page", "sort", "limit", "fields"];
      const queryObj = { ...req.query };
      excludesFields.forEach((field) => delete queryObj[field]);
      filter = { ...filter, ...queryObj };

      // Count total
      const documentsCount = await Model.countDocuments(filter);

      // Build query
      let query = Model.find(filter);
      if (populationOpt) query = query.populate(populationOpt);

      // Apply features
      const apiFeatures = new ApiFeatures(query, req.query)
        .filter()
        .search(modelName)
        .sort()
        .limitFields();

      const results = await apiFeatures.paginate();

      const currentPage = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;
      const numberOfPages = Math.ceil(documentsCount / limit);
      let nextPage = null;
      if (currentPage < numberOfPages) nextPage = currentPage + 1;

      return res.status(200).json({
        results: Array.isArray(results) ? results.length : results ? 1 : 0,
        paginationResult: {
          totalCount: documentsCount,
          currentPage,
          limit,
          numberOfPages,
          nextPage,
        },
        data: results,
      });
    } catch (error) {
      console.error("Error fetching documents:", error);
      return next(error);
    }
  };

// ---------------- deleteOne ----------------
exports.deleteOne = (Model) => async (req, res, next) => {
  try {
    console.log("here22");
    const { id } = req.params;
    const document = await Model.findById(id);
    if (!document) {
      return next(new ApiError(`No document for this id ${id}`, 404));
    }
    await Model.deleteOne({ _id: id });
    return res.status(200).json({ ok: true, deleted: true, id });
  } catch (error) {
    console.error("Error deleting document:", error);
    return next(error);
  }
};
