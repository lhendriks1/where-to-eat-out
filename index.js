'use strict';

//Global variables
let venueInformation = {};

const clientId = 'UUOPQTBDPSBVYHUIUCCJRP21KATM3Y5BQGUCBBZMIQU2HFIG';
const clientSecret = 'TSX4RM0T4SUT0ZEGHC1PH4AWSRCPEXIAD2OXR04UJSD530ZJ';
const venuesEndPoint = 'https://api.foursquare.com/v2/venues/';
const version = '20180801';

//Format query params for api calls
function formatQueryParams(params) {
  const queryItems = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
  return queryItems.join('&');
}

function addVenueDetails(venuesObj) {

  if ("venues" in venuesObj) {
    venueInformation[venuesObj.id].nextVenues = venuesObj.venues;
  } else if ("pic" in venuesObj) {
    venueInformation[venuesObj.id].pic = venuesObj.pic;
  } else {
    throw error("missing next venues or pic");
  }
}


//Display results
function displayResults(venueInformation) {
  $('#results-list').empty();

  for (let key in venueInformation) {
    $('#results-list').append(
      `<img src="https://igx.4sqi.net/img/general/220x220${venueInformation[key].pic}" alt="food from restaurant">
      <h3>${venueInformation[key].name}</h3>
      <p><ion-icon name="pin"></ion-icon>${venueInformation[key].address}</p>
      <p><button class="link">Where to go next?</button></p>
        <div id="next-venues-results" class="js-nextVenues hidden">
        </div>`
    )

    let nextVenues = venueInformation[key].nextVenues;
    for (let i = 0; i < nextVenues.length; i++) {
      $('.js-nextVenues').append(
        `<li>${nextVenues[i].name}
        <br>
         ${nextVenues[i].location.formattedAddress.slice(0,2).join(", ")}
        </li>`
      )
    }
  }

  $('#results').removeClass('hidden');

  $('#results-list').on('click', '.link', function() {
    $('#next-venues-results').toggle();
  })

};

//Call foursquare api to get venue picture data
function getVenuePic(venueId) {

  // Construct a query object
  const venueParams = {
    v: version,
    client_id: clientId,
    client_secret: clientSecret
  };

  // Format query object into a string
  const venueQueryString = formatQueryParams(venueParams);

  // Fetch the next Venues photo as a Promise
  return fetch(`${venuesEndPoint}${venueId}/photos?${venueQueryString}`)
    .then(r => {
      if (r.ok) {
        return r.json()
      }
      throw new Error(r.status);
    })
    .then(rJson => {
      var photoTemp = {};
      photoTemp.id = venueId;
      photoTemp.pic = rJson.response.photos.items[0].suffix;
      return photoTemp;
    })
}

// Returns a promise that fullfills with a object for next Venues
function getNextVenue(venueId) {

  // Construct a query object
  const venueParams = {
    v: version,
    client_id: clientId,
    client_secret: clientSecret
  };

  // Format query object into a string
  const venueQueryString = formatQueryParams(venueParams);

  // Fetch the next Venues object as a Promise
  return fetch(`${venuesEndPoint}${venueId}/nextvenues?${venueQueryString}`)
    .then(r => {
      if (r.ok) {
        return r.json()
      }
      throw new Error(r.status);
    })
    .then(rJson => {
      var nextVenuesTemp = {};
      nextVenuesTemp.id = venueId;
      nextVenuesTemp.venues = rJson.response.nextVenues.items;
      return nextVenuesTemp;
    });

}



//Inital api call to get foursquare venue results
function getFourSqResults(location, cuisine) {


  const exploreParams = {
    near: location,
    query: cuisine,
    limit: '2',
    v: version,
    client_id: clientId,
    client_secret: clientSecret
  };

  const exploreQueryString = formatQueryParams(exploreParams);
  const exploreApiUrl = venuesEndPoint + '/explore?' + exploreQueryString;

  fetch(exploreApiUrl)
    .then(r => {
      if (r.ok) {
        return r.json();
      }
      throw new Error(r.statusText);
    })
    .then(rJson => {
      let venues = rJson.response.groups[0].items;

      for (const v of venues) {
        venueInformation[v.venue.id] = {
          name: v.venue.name,
          address: v.venue.location.formattedAddress.slice(0, 2).join(", ")
        }
      }

      var venueIdArr = Object.keys(venueInformation);
      return Promise.all([getNextVenue(venueIdArr[0]), getNextVenue(venueIdArr[1]), getVenuePic(venueIdArr[0]), getVenuePic(venueIdArr[1])]);
    })
    .then(returnArray => {
      addVenueDetails(returnArray[0]);
      addVenueDetails(returnArray[1]);
      addVenueDetails(returnArray[2]);
      addVenueDetails(returnArray[3]);
      displayResults(venueInformation);
    })
    .catch(err => {
      if (err.message == 429) {
        $('#js-error-message').text(`Try again in 1 hour. Sorry -- to keep this service **free** we have to limit the number of search requests.`);
      }
      else if (err.message == 400) {
        $('#js-error-message').text('Hmmm.. we don\'t have any information on that');
      }
      else {
        $('#js-error-message').text(`Whoops, something went wrong.`);
      }
    });
}



//Watch form
function watchForm() {
  $('form').submit(event => {

    venueInformation = {}; //empty existing results
    $('#js-error-message').empty(); //empty existing error messages

    event.preventDefault();
    const location = $('#js-search-city').val();
    const cuisine = $('#js-search-query').val();
    getFourSqResults(location, cuisine);
  });
}

$(watchForm);
