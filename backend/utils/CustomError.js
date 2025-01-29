
const CustomError=(message,statusCode)=>{
  const err=new Error(message)
  err.statusCode=statusCode
  err.status=statusCode>=400 && this.statusCode<500 ?'fail':'error';
  err.isOperational=true
  Error.captureStackTrace(err,CustomError)
  return err
}
module.exports=CustomError;
