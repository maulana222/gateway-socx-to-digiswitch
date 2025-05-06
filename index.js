// Middleware script to handle request transformation between Server 1 and Server 2
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const url = require('url');
const app = express();
const PORT = process.env.PORT || 3000;
const SERVER2_URL = 'https://digiprosb.api.digiswitch.id/v1/user/ip/transaction'; // Replace with actual Server 2 URL

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Main endpoint to receive Server 1 requests
app.get('/trx', async (req, res) => {
  try {
    console.log('Incoming request from Server 1:', req.query);
    
    // Extract parameters from Server 1 request
    const {
      dest,         // destination number (phone)
      memberId,     // member ID 
      password,     // password
      pin,          // PIN
      product,      // product code
      refID,        // reference/transaction ID
      sign          // signature for verification
    } = req.query;
    
    // Validate required parameters
    if (!dest || !memberId || !password || !pin || !product || !refID) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Missing required parameters',
        code: 400
      });
    }
    
    // Map parameters to Server 2 format
    const server2Params = {
      id: memberId,
      pin: pin,
      user: "zidu38603", // Assuming user = memberId, adjust if needed
      pass: password,
      kodeproduk: product,
      tujuan: dest,
      idtrx: refID
    };
    
    console.log('Transformed request for Server 2:', server2Params);
    
    // Make request to Server 2
    const server2Response = await axios.get(SERVER2_URL, {
      params: server2Params,
      timeout: 30000 // 30 seconds timeout
    });
    
    console.log('Response from Server 2:', server2Response.data);
    
    // Process the response from Server 2
    // You may need to transform the response format based on what Server 1 expects
    const transformedResponse = {
      status: server2Response.data.status || 'SUCCESS',
      message: server2Response.data.message || 'Transaction processed',
      data: {
        trxId: refID,
        destination: dest,
        product: product,
        timestamp: new Date().toISOString(),
        // Include any additional fields from Server 2 response as needed
        ...server2Response.data
      }
    };
    
    // Send response back to Server 1
    return res.json(transformedResponse);
    
  } catch (error) {
    console.error('Error processing request:', error);
    
    // Handle different types of errors
    if (error.response) {
      // Server 2 responded with an error status
      console.error('Server 2 error response:', error.response.data);
      return res.status(502).json({
        status: 'ERROR',
        message: 'Error from downstream server',
        code: error.response.status,
        details: error.response.data
      });
    } else if (error.request) {
      // No response received from Server 2
      return res.status(504).json({
        status: 'ERROR',
        message: 'No response from downstream server',
        code: 504
      });
    } else {
      // Something else went wrong
      return res.status(500).json({
        status: 'ERROR',
        message: 'Internal middleware error',
        code: 500,
        details: error.message
      });
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Middleware server running on port ${PORT}`);
});

// Example of how Server 1 would call this middleware:
// GET /trx?dest=089677549509&memberId=suto90368&password=68188772152099.60234&pin=480274&product=DANACK&refID=85&sign=9QChvkeUOcKY00PJZkxMznjcGuM

// Example of how this middleware calls Server 2:
// GET /transaction?id=suto90368&pin=480274&user=suto90368&pass=68188772152099.60234&kodeproduk=DANACK&tujuan=089677549509&idtrx=85