import AWS from 'aws-sdk';

export const readApiKey = async (account) => {
    console.log("account here -----",account);
    return "this please";
}

//always give a number after parsing
export const roundToNearest5 = (price) => {
    return Math.round(price * 10) / 10;
}