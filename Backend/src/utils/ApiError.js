class ApiError extends Error {
    constructor(statusCode, 
        message ="Something went wrong ",
        error =[],
        stack ="",
    ){
        super(message);
        //parent mei paas hota hai
        this.statusCode = statusCode;
        this.message = message;
        this.error = error;
        this.data =null;
        this.success = false;
        this.errors = error;

        if(stack){
            this.stack =stack;
        }else{
            Error.captureStackTrace(this,this.constructor);
        }
    }
}
export {ApiError};