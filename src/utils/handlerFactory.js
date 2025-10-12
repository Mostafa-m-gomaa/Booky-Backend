// const ApiError = require("./apiError");
// const ApiFeatures = require("./apiFeatures");

// exports.updateOne = (Model) => async (req, res, next) => {
//   try {
//     const document = await Model.findByIdAndUpdate(req.params.id, req.body, {
//       new: true,
//     });

//     if (!document) {
//       return next(
//         new ApiError(res.__("errors.Not-Found", { document: "document" }), 404)
//       );
//     }

//     let localizedDocument;
//     if (typeof Model.schema.methods.toJSONLocalizedOnly === "function") {
//       localizedDocument = Model.schema.methods.toJSONLocalizedOnly(document, req.locale);
//     } else {
//       // fallback لو الميثود مش موجودة
//       localizedDocument = document.toObject ? document.toObject() : document;
//     }

//     res
//       .status(200)
//       .json({ status: `updated successfully`, data: localizedDocument });

//   } catch (error) {
//     console.error("Error updating document:", error);
//     res.status(500).json({ error: error.message });
//   }
// };

// exports.createOne = (Model) => async (req, res) => {
//   try {
//     const document = await Model.create(req.body);
//     // const localizedDocument = Model.schema.methods.toJSONLocalizedOnly(
//     //   document,
//     //   req.locale
//     // );
//     return res
//       .status(201)
//       .json({ status: `created successfully`, data: document });
//   } catch (error) {
//     console.error("Error creating document:", error);
//     return res.status(500).json({ error: error.message });
//   }
// };

// exports.getOne = (Model, populationOpt) => async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     //1-build query
//     let query = Model.findById(id);
//     if (populationOpt) {
//       query = query.populate(populationOpt);
//     }
//     //2- excute query
//     const document = await query;

//     if (!document) {
//       return next(new ApiError(`No document For this id ${id}`, 404));
//     }
//     const { title } = document;
//     const localizedResult = Model.schema.methods.toJSONLocalizedOnly(
//       document,
//       req.locale
//     );
//     localizedResult.translationTitle = title;
//     if (document.description) {
//       localizedResult.translationDescription = document.description;
//     }
//     if (document.highlights) {
//       localizedResult.translationHighlights = document.highlights;
//     }
//     if (document.content) {
//       localizedResult.translationContent = document.content;
//     }

//     return res.status(200).json({ data: localizedResult });
//   } catch (error) {
//     console.error("Error fetching document:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };
// exports.getAll = (Model, modelName = "", populationOpt) =>
//   async (req, res) => {
//     try {
//       let filter = {};

//       // Apply initial filter if exists
//       if (req.filterObj) {
//         filter = req.filterObj;
//       }

//       // If no initial filter, build from query params
//       if (Object.keys(filter).length === 0) {
//         const excludesFields = ["page", "sort", "limit", "fields"];
//         const queryObj = { ...req.query };
//         excludesFields.forEach((field) => delete queryObj[field]);
//         filter = { ...queryObj };
//       }

//       // Count documents with the filter
//       const documentsCount = await Model.countDocuments(filter);

//       // Build initial query with filter and population
//       let query = Model.find(filter);
//       if (populationOpt) {
//         query = query.populate(populationOpt);
//       }

//       // Apply API features
//       const apiFeatures = new ApiFeatures(query, req.query)
//         .filter()
//         .search(modelName)
//         .sort()
//         .limitFields();

//       // Get paginated results
//       const results = await apiFeatures.paginate();

//       // Apply localization if method exists
//       let localizedResult = results;
//       if (Model.schema.methods && Model.schema.methods.toJSONLocalizedOnly) {
//         localizedResult = Model.schema.methods.toJSONLocalizedOnly(
//           results,
//           req.locale
//         );
//       }

//       // Calculate pagination
//       const currentPage = parseInt(req.query.page, 10) || 1;
//       const limit = parseInt(req.query.limit, 10) || 50;
//       const numberOfPages = Math.ceil(documentsCount / limit);
//       let nextPage = null;

//       if (currentPage < numberOfPages) {
//         nextPage = currentPage + 1;
//       }

//       return res.status(200).json({
//         results: results.length,
//         paginationResult: {
//           totalCount: documentsCount,
//           currentPage,
//           limit,
//           numberOfPages,
//           nextPage,
//         },
//         data: localizedResult,
//       });
//     } catch (error) {
//       console.error("Error fetching documents:", error);
//       res.status(500).json({
//         error: "Internal server error",
//         message: error.message,
//       });
//     }
//   };

// // exports.deleteOne = (Model) => async (req, res, next) => {
// //   try {
// //     const { id } = req.params;
// //     const document = await Model.findByIdAndDelete(id);
// //     if (!document) {
// //       return next(new ApiError(`No document for this id ${id}`, 404));
// //     }
// //     // Trigger "remove" event when delete document
// //     document.remove();
// //     res.status(204).send();
// //   } catch (error) {
// //     console.error("Error deleting document:", error);
// //     res.status(500).json({ error: "Internal server error" });
// //   }
// // };

// exports.deleteOne = (Model) => async (req, res, next) => {
//   try {
//     const { id } = req.params;

//     // أحضر الوثيقة أولاً (ما نستخدم findByIdAndDelete هنا)
//     const document = await Model.findById(id);
//     if (!document) {
//       return next(new ApiError(`No document for this id ${id}`, 404));
//     }

//     // إذا عندك تحقق صلاحيات أو منع حذف لو مرتبط بحجوزات - ضيفه هنا

//     // نجرّب تشغيل أي ميثود حذف متاحة على الـ document (تضمن تشغيل middleware المناسبة)
//     if (typeof document.remove === 'function') {
//       // remove() قد يكون deprecated لكن لو موجود سيشغّل pre/post remove hooks
//       await document.remove();
//     } else if (typeof document.deleteOne === 'function') {
//       // deleteOne() متاح على الوثيقة في Mongoose الحديثة
//       await document.deleteOne();
//     } else {
//       // كحل نهائي - حذف مباشر من المودل
//       await Model.deleteOne({ _id: id });
//     }

//     return res.status(204).send();
//   } catch (error) {
//     console.error("Error deleting document:", error);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// };

// handlerFactory.js
const ApiError = require("./apiError");
const ApiFeatures = require("./apiFeatures");

// --- Helper: safe call to optional localization method ---
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
  // fallback: return data as-is (convert mongoose docs to plain objects where appropriate)
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
