function notFound(req, res) {
  res.status(404).json({ message: "Not Found" });
}

function errorHandler(err, req, res, next) {
  console.error("Error:", err.stack);
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
}

module.exports = { notFound, errorHandler };
