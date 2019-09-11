'use strict';

// global variables
let venueInformation = {};

const clientId = 'UUOPQTBDPSBVYHUIUCCJRP21KATM3Y5BQGUCBBZMIQU2HFIG';
const clientSecret = 'TSX4RM0T4SUT0ZEGHC1PH4AWSRCPEXIAD2OXR04UJSD530ZJ';
const venuesEndPoint = 'https://api.foursquare.com/v2/venues/';
const version = '20180801';

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

function displayResults(venueInformation) {
  $('#results-list').empty();

  for (let key in venueInformation) {
    $('#results-list').append(
      `<img src="https://igx.4sqi.net/img/general/220x220${venueInformation[key].pic}" alt="food from restaurant">
      <h3>${venueInformation[key].name}</h3>
      <p><ion-icon name="pin"></ion-icon>${venueInformation[key].address}</p>
      <div class="next-venues-button">
        Where to go next? <ion-icon class="float-right" name="arrow-dropdown"></ion-icon>
        <div class="js-nextVenues hidden">
        <hr>
        <p class="subtext">These are venues that people often visit after the current venue</p>
        </div>
      </div>`
    )

    let nextVenues = venueInformation[key].nextVenues;
    for (let i = 0; i < nextVenues.length; i++) {
      $('.js-nextVenues').append(
        `<li><span class="bold block">${nextVenues[i].name}</span>
          <span class="lighter">${nextVenues[i].location.formattedAddress.slice(0,2).join(", ")}</span>
        </li>`
      )
    }
  }

  $('#results').removeClass('hidden');
};

// call foursquare api to get venue picture data
function getVenuePic(venueId) {

  // construct a query object
  const venueParams = {
    v: version,
    client_id: clientId,
    client_secret: clientSecret
  };

  // format query object into a string
  const venueQueryString = formatQueryParams(venueParams);

  // fetch the next Venues photo as a Promise
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

// returns a promise that fullfills with a object for next Venues
function getNextVenue(venueId) {

  // construct a query object
  const venueParams = {
    v: version,
    limit: '5',
    client_id: clientId,
    client_secret: clientSecret
  };

  // format query object into a string
  const venueQueryString = formatQueryParams(venueParams);

  // fetch the next Venues object as a Promise
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

// initial api call to get foursquare venue results
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
      $('#results-list').empty();
      if (err.message == 429) {
        $('#js-error-message').text(`Try again in 1 hour. Sorry -- to keep this service free we have to limit the number of search requests.`);
      }
      else if (err.message == 400) {
        $('#js-error-message').text('We don\'t have any information for that place/venue. Make sure to include the city + state (& check your spelling)');
      }
      else if (err.message == 500) {
        $('#js-error-message').text('Our bad -- our server is grumpy. Please try your request again later.');
      }
      else if (err.message == 401 | err.message == 403) {
        $('#js-error-message').text('This request is not authorized.');
      }
      else {
        $('#js-error-message').text(`Whoops, something went wrong.`);
      }
    });
}

function watchForm() {
  $('form').submit(event => {

    // empty existing results from global obj
    venueInformation = {};

    // empty existing error messages
    $('#results').addClass('hidden');
    $('#js-error-message').empty();

    event.preventDefault();
    const location = $('#js-search-city').val();
    const cuisine = $('#js-search-query').val();
    getFourSqResults(location, cuisine);
  });
}

// listen for clicks to toggle (hide/show) the 'next venues' section
function nextVenuesClickHandler() {
  $('#results-list').on('click', '.next-venues-button', function(event) {
    $(this).children('.js-nextVenues').toggle();
  });
}

$(nextVenuesClickHandler);
$(watchForm);
