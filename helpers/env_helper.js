const dotenv = require('dotenv');

dotenv.config();


const GITRAIL_DEBUG = process.env.GITRAIL_DEBUG_MODE;

function is_debug(){
    return(GITRAIL_DEBUG == "true")
}

module.exports = {
    is_debug
  };