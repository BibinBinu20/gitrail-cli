import dotenv from "dotenv";

dotenv.config();


const GITRAIL_DEBUG = process.env.GITRAIL_DEBUG_MODE;

export function is_debug(){
    return(GITRAIL_DEBUG == "true")
}

