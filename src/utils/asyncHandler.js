//this utility is used to wrap any function that it accepts in a async-await and try-catch functionality to properly utilize any asynchronous functions. We will have to again and again use these commands throughout our application, so we are just creating a function, which is also a higher order function as it is accepting a callback function, and it will execute the callback function in async-await and try-catch block wrapper. So we have to just pass a function in asyncHandler for any of the asynchronous operation. This functionality can be achieved in two ways. They are-
//1) using Promises
//2)using async-await and try-catch
//Both of the practises are being used in the industry, just to be aware how they are done, both of the process are written here. We will go with Promises.

const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((error) =>
      next(error)
    );
  };
};

export { asyncHandler };

// const asyncHandler = ()=>{}
// const asyncHandler = (func)=> () => {}      //this notation is how we pass callback functions in arrow functions and execute them.
// const asyncHandler = (func)=> async () => {}

// const asyncHandler = (fn)=>async (req, res, next) =>{
//     try{
//         await fn(req, res, next)
//     }catch(error){
//         res.status(error.code||500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }
