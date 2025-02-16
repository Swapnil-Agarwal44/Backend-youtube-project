class apiError extends Error {
  // this file is used to manage error handling in a structured way. Error is a built in class in node and we are creating a custom class called apiError that will have properties of the Error class, and will also have some customized functions as per requirement.
  constructor(
    statusCode,
    message = "something went wrong",
    errors = [],
    stack = ""
  ) {
    super(message); //super keyword is used to call the constructor of the parent class
    this.statusCode = statusCode;
    this.message = message;
    this.data = null;
    this.success = false;
    this.errors = errors;

    if (stack) {
      //this piece of code is used in debugging purposes in backend. Right now, no need to understand in deep, just write it
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { apiError };
