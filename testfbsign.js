const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
require('dotenv').config();


const axios = require('axios');
// const appId = '194770603246503';
// const appSecret = '723002b34daf5f23a00b77b54dc67303';

// const accessTokenUrl = `https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`;




const port = 80;



const app = express();
app.use(bodyParser.json());

// MySQL database configuration
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    process.exit(1);
  }
  console.log('Connected to the database');
});

//verify mail
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
//START of signup API
app.post('/api/1.0/users/signup', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide name, email, and password' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }


  // Check if email already exists in the database
  const checkEmailQuery = 'SELECT * FROM users WHERE email = ?';
  connection.query(checkEmailQuery, [email], (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).json({ error: 'Server Error' });
    }

    if (results.length > 0) {
      // Email already exists
      return res.status(403).json({ error: 'Email Already Exists' });
    } else {
      // Assuming the user information is valid, save user information to the database
      const insertUserQuery = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
      connection.query(insertUserQuery, [name, email, password], (err, result) => {
        if (err) {
          console.error('Error executing query:', err);
          return res.status(500).json({ error: 'Server Error' });
        }

        // Retrieve the inserted user ID from the result
        const userId = result.insertId;

        // Construct the user object with the database ID
        let user = {
          id: userId,
          provider: 'native',
          name,
          email,
          picture: 'https://schoolvoyage.ga/images/123498.png'
        };

        const crypto = require('crypto');

        const generateSecretKey = () => {
          const length = 32; // 256 bits
          return crypto.randomBytes(length).toString('hex');
        };

        const secretKey = generateSecretKey();

        const payload = {
          userId: user.id,
          name: user.name,
          email: user.email
        };

        const accessToken = jwt.sign(payload, secretKey);



        // Assuming the user information is valid, generate the access token
        //const accessToken = generateAccessToken(user);

        // Return success response with access token and user information
        return res.status(200).json({
          data: {
            access_token: accessToken,
            user
          }
        });
      });
    }
  });
});

//END of signup API


//START of signin API
app.post('/api/1.0/users/signin', (req, res) => {
  const { provider, email, password, access_token } = req.body;

  if (!provider || (provider === 'native' && (!email || !password)) || (provider === 'facebook' && !access_token)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  if (provider === 'native' && !validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (provider !== 'native' && provider !== 'facebook') {
    return res.status(403).json({ error: 'Invalid provider' });
  }

  if (provider === 'native') {
    const signInQuery = 'SELECT * FROM users WHERE email = ?';
    connection.query(signInQuery, [email], (err, results) => {
      if (err) {
        console.error('Error executing query:', err);
        return res.status(500).json({ error: 'Server Error' });
      }

      if (results.length === 0) {
        // Email not found
        return res.status(403).json({ error: 'User not found' });
      } else {
        const nauser = results[0];
        //const userId = results[0].id;


        if (provider === 'native' && nauser.password !== password) {
          // Wrong password
          return res.status(403).json({ error: 'Ohh! wrong password:(' });
        }

        user = {
            id: nauser.id,
            provider: 'native',
            name:nauser.name,
            email:nauser.email,
            picture:nauser.picture,
          };

        const crypto = require('crypto');
        const generateSecretKey = () => {
          const length = 32; // 256 bits
          return crypto.randomBytes(length).toString('hex');
        };

        const secretKey = generateSecretKey();

        const payload = {
          userId: user.id,
          name: user.name,
          email: user.email
        };

        const accessToken = jwt.sign(payload, secretKey);
        // success response
        return res.status(200).json({
          data: {
            access_token: accessToken,
            user
          }
        });
      }
    });
  } else if (provider === 'facebook') {
    //fb still working...

    // fetch(accessTokenUrl)
    // .then(response => response.json())
    // .then(data => {
        //console.log(access_token);
        const accessToken = access_token;
        //console.log(accessToken);
        const regex = /(\d+)\|/; //check the format
        const match = accessToken.match(regex); 

        if (match && match.length > 1) {
            const userid = match[1];
            //console.log(`user id is${userid}`);
            const apiVersion = 'v12.0';
            //const userid = '194770603246503'; // Replace with the desired user ID or 'me' for the currently authenticated user

             // Construct the API request URL
            const url = `https://graph.facebook.com/${apiVersion}/${userid}?access_token=${accessToken}`;
            // Send the GET request using Axios
            axios.get(url)
            .then(response => {
                //retrieve profile information
               // const profileData = response.data;
                // console.log(profileData);
                const { name, email, picture } = response.data;
    
                // Add profileData to DB
                //const { name, email, picture } = profileData;
                // const fbname = profileData.name;
                // const fbemail = 'abc@gmail.com'
                const insertDataQuery = 'INSERT INTO users (name,email,picture) VALUES (?,?,?)';
  
                //need to change to name, email, picture
                connection.query(insertDataQuery, [name,email,picture], (err, result) => {
                    if (err) {
                        console.error('insert wrong', err);
                        return;
                    }
                    const FBuserId = result.insertId;
                    console.log('insert to db succeed');
                    user = {
                        id: FBuserId,
                        provider: 'facebook',
                        name,
                        email:'abc',
                        picture:'abc'
                      };

                      const crypto = require('crypto');
                      const generateSecretKey = () => {
                        const length = 32; // 256 bits
                        return crypto.randomBytes(length).toString('hex');
                      };
              
                      const secretKey = generateSecretKey();
              
                      const payload = {
                        userId: user.id,
                        name: user.name,
                        //email: user.email
                      };
              
                      const accessToken = jwt.sign(payload, secretKey);
                      // success response
                      return res.status(200).json({
                        data: {
                          access_token: accessToken,
                          user
                        }
                      });
                  });      

              })//response end
              .catch(error => {
                console.error('connect to Facebook Graph API wrong：', error);
               });
      
        } else {
            console.log('Access token format is not valid.');
        }
        // console.log(accessToken);
        // console.log(`accestoken is ${accessToken.access_token}`);
        // console.log(data);
        // console.log(`name is ${data.name}`);
      // const name = data.name;
      // const email = data.email;
      // const pictureUrl = data.picture.data.url;
        
        
        

        //    })//end of fetch url
    //       .catch(error => {
    //         console.error('connect to Facebook Graph API wrong：', error);
    //        })
     
    // .catch(error => {
    //     console.error('Error retrieving Facebook access token:', error);
    // });

       
   }
  // FB session end
});

//END of signin API



// Error handling middleware (same as before)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'ohh !Server Error' });
});

app.listen(port, () => {
  console.log(`Server on http://localhost:${port}/`);
});



