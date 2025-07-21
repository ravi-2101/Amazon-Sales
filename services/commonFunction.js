const serverErrorResponse = (res,error) => {
  return res.status(error?.response?.status || error?.status || 500).json({
    isSuccess: false,
    message: "Internal Server Error",
    error:  error?.message || error?.response?.data?.message,
  });
};

const createErrorResponse = (res,message, status , details) => {
  return res.status(status).json({
    isSuccess: false,
    message,
    ...(details && { details }),
  });
};

const createSuccessResponse = (res,message, data, status , details ) => {
  return res.status(status).json({
    isSuccess: true,
    message,
    data,
    ...(details && { details }),
  });
};

module.exports = {
  serverErrorResponse,
  createErrorResponse,
  createSuccessResponse,
};
