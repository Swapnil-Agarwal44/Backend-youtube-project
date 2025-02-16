class apiResponse {
  // just like handing error in apiError file, we are handing responses and status codes in a structured way with apiResponse class.

  //NOTE: Why are we not using any built in class like in apiError??
  // Answer: Because Error class is a built in class of NODE, but reponses are managed by Express, which doesn't provide any such classes. That's why we have to create entirely new class for such management of the responses.
  constructor(statusCode, data, message = "success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export { apiResponse };
