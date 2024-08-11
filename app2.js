import express from 'express';
import AWS from 'aws-sdk';
import Redis from 'ioredis';

const app = express();
app.use(express.json());
const port = 3000;

const client = new Redis({
    password: 'ZmcMxw7ytheax0m94es6AUR7uhbdWs52',
    host: 'redis-12047.c114.us-east-1-4.ec2.redns.redis-cloud.com',
    port: 12047
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

app.get('/healthCheck', (req, res) => {
    console.log("health check api hit >>>>>>>>>>>>>>");
    res.send("health check passed");
})

app.get('/placeOrder', (req, res) => {
    //place order by getting the details here
    console.log("place order api hit >>>>>>>>>>>>>>>>>", req.body);
    res.send("order place successfully");
})

app.post("/stopOrders", async (req, res) => {
    //logic to update the tsym for which the trading has to be stopped here
    try {
        console.log('req.body here in stop orders ----->>>>', req.body);
        console.log("req.query here ------>>>>>", req.query);
        console.log("req.params here ------>>>>>", req.params);
        console.log("stop orders api hit >>>>>>>>>>>");

        // Set the key with a value
        await client.set("thisKey", "this value please");

        // Set expiration time for the key (e.g., 60 seconds)
        await client.expire("thisKey", 60);

        res.send("stopped successfully ");
    } catch (e) {
        res.status(404).send("failed to stop here");
        console.log("error here boossss ---------", e);
    }

    // res.send("stopped further orders on this script");
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
