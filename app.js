import express from 'express';
import AWS from 'aws-sdk';
const app = express();
app.use(express.json());
const port = 3000;
import {createClient} from 'redis';
import {readApiKey,roundToNearest5} from './helpers.js';
import axios from 'axios';

const PLACE_ORDER = "https://piconnect.flattrade.in/PiConnectTP/PlaceOrder";
const MODIFY_ORDER = "https://piconnect.flattrade.in/PiConnectTP/ModifyOrder";
const CANCEL_ORDER = "https://piconnect.flattrade.in/PiConnectTP/CancelOrder";

const client = createClient({
    password: 'ZmcMxw7ytheax0m94es6AUR7uhbdWs52',
    socket: {
        host: 'redis-12047.c114.us-east-1-4.ec2.redns.redis-cloud.com',
        port: 12047
    }
});

async function connectToRedis() {
  try {
    await client.connect();
    console.log('Connected to Redis');
  } catch (error) {
    console.error('Error connecting to Redis:', error);
    // Handle connection error appropriately (e.g., stop the application)
  }
}

connectToRedis();

app.get('/', (req, res) => {
    console.log("this please on home page");
  res.send('Hello World!')
})

app.get('/healthCheck',(req,res) => {
    console.log("health check api hit >>>>>>>>>>>>>>");
    res.send("health check passed");
})

app.post("/closePositions",(req,res) => {
  console.log("close positions triggered ---------->>>>>>>>>>>>>>>");
  const {body,params,query} = req;
  console.log("body here ---->>>>>>",body);
  console.log("query heree ->>>>>>",query);

  // const {} = body;
  const {jKey,account,tsym} = query;

})

app.post('/placeOrder',async (req,res) => {
  console.log("place otder hit here -----");
    //place order by getting the details here
    const {body,params,query} = req;
    const {prctyp,tsym,prc,trantype} = body;
    console.log("body ->>>>>>>>",body);
    console.log("params ->>>>>>>>>",params);
    console.log("query ->>>>>>>>>>>",query);
    const {jKey,is_sl_order,account} = query;
    const resp = await axios.post(PLACE_ORDER,`jData=${JSON.stringify(body)}&jKey=${jKey}`);
    console.log("response here from axios ------",resp?.data);
    console.log("resp.status -----",resp.status);
    if(resp.status == 200){
      res.send("place successfully");
      if(prctyp?.includes("SL") && is_sl_order && (resp?.data?.stat == "Ok" || resp?.data?.stat == "OK")){
        //store this
        const {norenordno} = resp?.data;
        const jsonObj = {
          norenordno,
          price: prc,
          trantype
        }
        const key = `${account}:${tsym}:SL_ORDER_NO`;
        const fullKey = `${account}:${tsym}:SL_ORDER_DETAILS`;
        await client.set(fullKey,JSON.stringify(body));
        await client.set(key,JSON.stringify(jsonObj));
      }
    }
    else{
      res.send("failed to place order");
    }
})

app.post("/clearRedisKeys", async (req,res) => {
    const {body,params,query} = req;
    const {account, jKey, is_sl_order,tsym} = query;
    console.log("query ->>>>>>>>>>>",query);
    res.send(`cleared all key related to account ${account} and tsym ${tsym}`);


});

app.post('/placeSlOrder',(req,res) => {
    console.log("sl order place sucessfully");
    const {body,params,query} = req;
    console.log("body here ------",body);
    console.log("params here ------",params);
    console.log("query here -----",query);
    const apikey = readApiKey(query?.account);
    console.log("apiKey -----",apikey);
    res.status(200).send("recieved successfullyyy -----");

})

app.post('/modifySlOrder', async (req,res) => {
    //  const {norderno} = req.params;
    // const {orderNo} = req.body;
    console.log("use this to modify the sl of the existing order -----");
    // res.status(200).send("modified sl to new value ------");
    const {body,params,query} = req;
    console.log("body here -----",body);
    console.log("params here -----",params);
    console.log("query here -------",query);
    const {newPrice,last_close} = body;
    const {tsym,account,jKey} = query;

    /*
      new price is ema9,
      check for direction and try to find the closest/farthest sl price
      if
    */
    // const jsonObj = await client.get(`${account}:${tsym}:SL_ORDER_NO`);
    const fullObj = await client.get(`${account}:${tsym}:SL_ORDER_DETAILS`);
    const lastOrderNo = await client.get(`${account}:${tsym}:SL_ORDER_NO`);
    let parsedFullObj = null;
    let parsedOrderNo = null;
    try{
        parsedFullObj = JSON.parse(fullObj);
        parsedOrderNo = JSON.parse(lastOrderNo);
    }catch(e){
        res.status(400).send("failed to get keys from redis");
    }
    if(!parsedFullObj || !parsedOrderNo)console.log("not foudn in redis");
    else{
      console.log("do the calculation to price for modfying ");
      const {uid,exch,tsym,qty,prc,trantype,prctyp,ret,prd} = parsedFullObj;
      const {norenordno} = parsedOrderNo;
      let modifiedSl = prc;
      if(trantype == "B"){
          const roundedValue = roundToNearest5(newPrice);
          console.log("rounded value -------",roundedValue);
          if(roundedValue + 0.5 < prc){
            console.log("inside if for 0.5 check -----");
            modifiedSl = roundedValue;
            const diff =  roundedValue - last_close;
            console.log("diff in B ----->>>>>>>>>>>>",diff);
            if(diff > 2.5) modifiedSl += 0;
            else if(diff > 0.5 && diff < 2.5) modifiedSl += 0.5;
            // else (edge case where the diff can be nagative ) ------------------------------------------================================== do this
            // console.log("diff between the actual and the modified price ----->>>>>>>>>>>>>",diff);
            // console.log("modifiedSL in case of B ------=======>>>>>>>>>>>",roundedValue, modifiedSl);
          }

      }
      else if(trantype == "S"){
          const roundedValue = roundToNearest5(newPrice);
          console.log("rounded value here  ---------",roundedValue);
          if(roundedValue - 0.5 > prc){
            console.log("inside if for 0.5 check --------");
            modifiedSl = roundedValue;
            const diff = last_close - roundedValue;
            console.log("diff in S ----->>>>>>>>>>>>",diff);
            if(diff > 2.5) modifiedSl -= 0;
            else if(diff > 0.5 && diff < 2.5) modifiedSl -= 0.5;
            // else (edge case where the diff can be nagative ) ------------------------------------------================================== do this
            // console.log("diff between the actual and the modified price ----->>>>>>>>>>>>>",diff);
            // console.log("modifiedSL in case of S ------=======>>>>>>>>>>>",roundedValue, modifiedSl);
          }
      }


      const reqBody = {
          exch,
          norenordno,
          tsym,
          uid: account,
          actid:account,
          qty,
          trgprc: String(modifiedSl),
          prc: String(modifiedSl),
          prctyp,
          ret,
          prd
      };


      console.log("reqBody for modifying order ----->>>>>>>>>>>>>>",reqBody);


      const response = await axios.post(MODIFY_ORDER,`jData=${JSON.stringify(reqBody)}&jKey=${jKey}`);
      console.log("response of mody order ->>>>>>>>>>>>>====================",response?.data);
      if(response.status == 200){
        console.log("existing order modified succesfully ------------------->>>>>>>>>>>>>>");
        res.status(200).send("order modified succesfully");
        const newFullObj = parsedFullObj;
        newFullObj['prc'] = String(modifiedSl);
        newFullObj['trgprc'] = String(modifiedSl);

        const newOrderNo = parsedOrderNo;
        newOrderNo['price'] = modifiedSl;

        await client.set(`${account}:${tsym}:SL_ORDER_DETAILS`,JSON.stringify(newFullObj));
        await client.set(`${account}:${tsym}:SL_ORDER_NO`,JSON.stringify(newOrderNo));
      }
      else{
        console.log("failed to modify order here ------>>>>>>>>>>>");
        res.status(400).send("failed to modify ls of the order");
      }
    }
    // const
    // console.log("jsonObj here -------",jsonObj);
    // const parsedObj = JSON.parse(jsonObj);
    // const {price,norenordno,trantype} = parsedObj;
    // const newBody = {
    //   norenordno,
    //   exch: "MCX",
    //   tsym,
    //   uid: account,
    //   prc: newPrice
    // }
    // const responsee = await axios.post(MODIFY_ORDER,`jData=${JSON.stringify(newBody)}&jKey=${jKey}`);
    // console.log("response  ->>>>>>>>>>>>>>>>",responsee?.data);

    // res.send("modifed succesfully here --------");
    // const
    /*
    should have the accountId and tsym to get from redis cache
    */
    // const jsonData = await redis.get(`${account}:${tsym}`);
    //change the price to newPrice
  // res.send("successful boss -------->>>>>>>>>>>>>>");

})

app.post("/stopOrders",async (req,res) => {
    //logic to update the tsym for which the trading has to be stopped here
   try {
    const {params,body} = req || {};
    const {tsym} = body;
    console.log("tysm to stop is -----",tsym);
    //key = account:tsym
    // tsym = tsym.toLower
    const key = tsym;
    const value = "values_boss_here";
    const ttlSeconds = 60;

    // Check if key already exists (optional)
    const date = new Date();
    console.log("date here ------",date);
    const doesExist = await client.exists(key);
    if (doesExist) {
      console.log(`Key '${key}' already exists, overwriting with new value.`);
    }

    await client.set(key, value);
    console.log("successfullyyyy sertewetetette"); // Assuming responses is defined elsewhere

    await client.expire(key, ttlSeconds);
    console.log('TTL set successfully:'); // Assuming expireResponse is defined elsewhere

    res.status(200).send("yess boossss doneeee");
  } catch (error) {
    console.error('Error setting key or TTL:', error);
    res.status(404).send("failed to stop hre -----");
  }

    // res.send("stopped further orders on this script");
})

app.listen(port, () => {
  console.log(` app listening on port ${port}`)
})



/*

can use websocket here -------
*/