const express = require('express');
const router = express.Router();
const db = require('./database');
const redis = require('./index');

router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const qHostelOverview = `SELECT 
  totalReviewCount, avgRating, ratedFeatures 
  FROM hostels WHERE hostelid = ${id};`;
  
  const qCommentsOverview = `SELECT
  c.created_at, c.rate, c.text,
  u.country, u.username, u.age, u.status
  FROM comments AS c
  INNER JOIN users AS u ON c.userid = u.userid
  WHERE c.hostelid = ${id}
  ORDER BY c.created_at DESC;`;
  
  db.connect((err, db, release) => {
    if (err) {
      return console.log('Error acquiring client', err.stack);
    }

    const hostelOverview = db.query(qHostelOverview);
    const commentsOverview = db.query(qCommentsOverview);
  
    // const start = Date.now();
    Promise.all([hostelOverview, commentsOverview])
    .then( result => {
      // console.log('PROMISES RESOLVED', Date.now() - start);
      release(); //releasing the client because it's finished with what it's had to do with the db
      let toReturn = {};
      const hostelResults = result[0].rows[0];
      toReturn['avgRating'] = hostelResults['avgrating'];
      toReturn['totalReviewCount'] = hostelResults['totalreviewcount'];
      toReturn['ratedFeatures'] = [
        {feature: 'Value For Money', 
        rating: hostelResults['ratedfeatures'][0]},
        {feature: 'Security', 
        rating: hostelResults['ratedfeatures'][1]},
        {feature: 'Location', 
        rating: hostelResults['ratedfeatures'][2]},
        {feature: 'Staff', 
        rating: hostelResults['ratedfeatures'][3]},
        {feature: 'Atmosphere', 
        rating: hostelResults['ratedfeatures'][4]},
        {feature: 'Cleanliness', 
        rating: hostelResults['ratedfeatures'][5]},
        {feature: 'Facilities', 
        rating: hostelResults['ratedfeatures'][6]},
      ];

      toReturn['reviews'] = [];
      const reviewResults = result[1].rows;
      for (let i = 0; i < 4; i++) {
        if (reviewResults[i]) {
          toReturn['reviews'].push({
              created_at: reviewResults[i]['created_at'],
              rate: reviewResults[i]['rate'],
              text: reviewResults[i]['text'],
              user: {
                username: reviewResults[i]['username'],
                age: reviewResults[i]['age'],
                status: reviewResults[i]['status'],
                country: reviewResults[i]['country'],
          }});
        }
      }
      toReturn['countryCount'] = {};
      const countryArr = result[1].rows;
      for (let i = 0; i < countryArr.length; i++) {
        if (!toReturn['countryCount'][countryArr[i].country]) {
          toReturn['countryCount'][countryArr[i].country] = 1;
        } else {
          toReturn['countryCount'][countryArr[i].country]++;
        }
      }
      res.status(200).send(toReturn);
    })
    .catch( err => console.log(err));
  });
});

module.exports = router;


/*
------------------HOSTELS OVERVIEW:
SELECT
totalReviewCount, avgRating, ratedFeatures
FROM hostels WHERE hostelid = 1;

Optimizations:
- index on (totalReviewCount, avgRating, ratedFeatures)
------------------COMMENTS OVERVIEW:
SELECT
c.created_at, c.rate, c.text,
u.country, u.username, u.age, u.status
FROM comments AS c
INNER JOIN users AS u ON c.userid = u.userid
WHERE c.hostelid = 1
ORDER BY c.created_at DESC
LIMIT 4;

Optimizations:
- 
------------------COUNTRIES OVERVIEW:
SELECT u.country FROM comments AS c
INNER JOIN users AS u ON c.userid = u.userid
WHERE hostelid = 1;

Optimizations:
- index on comments (hostelid)
- primary key users userid
*/