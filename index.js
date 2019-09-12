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

function addVenueDetails(nextVenuesObj) {
  if ("venues" in nextVenuesObj) {
    venueInformation.venuesObj[nextVenuesObj.id].nextVenues = nextVenuesObj.venues;
  } else if ("pic" in nextVenuesObj) {
    venueInformation.venuesObj[nextVenuesObj.id].pic = nextVenuesObj.pic;
  } else {
    throw error("missing next venues or pic");
  }
}

function displayResults(venueInformation) {
  $('#results-list').empty();

  $('#js-query-input').text(`Results for ${venueInformation.location.toUpperCase()} and ${venueInformation.cuisine.toUpperCase()}`);

  for (let key in venueInformation.venuesObj) {
    $('#results-list').append(
      `<img src="https://igx.4sqi.net/img/general/220x220${venueInformation.venuesObj[key].pic}" alt="food from restaurant">
      <h3>${venueInformation.venuesObj[key].name}</h3>
      <ion-icon name="pin" class="float-left"></ion-icon>
      <div>
      <span class="block">${venueInformation.venuesObj[key].address.slice(0, 1).join(", ")}</span>
      <span>${venueInformation.venuesObj[key].address.slice(1, 2).join(", ")}</span>
      </div>

      <div class="next-venues-button">
        Where to go next? <ion-icon class="float-right" name="arrow-dropdown"></ion-icon>
        <div class="js-nextVenues hidden">
        <hr>
        <p class="subtext">These are venues that people often visit after the current venue</p>
        </div>
      </div>`
    )

    let nextVenues = venueInformation.venuesObj[key].nextVenues;
    for (let i = 0; i < nextVenues.length; i++) {
      $('.js-nextVenues').append(
        `<li><span class="bold block">${nextVenues[i].name}</span>
          <span class="lighter block">${nextVenues[i].location.formattedAddress.slice(0,1).join(", ")}</span>
          <span class="lighter block">${nextVenues[i].location.formattedAddress.slice(1,2).join(", ")}</span>
        </li>`
      )
    }
  }

  $('#js-search-city').val("");
  $('#js-search-query').val("");
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
    limit: 5,
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
    limit: 5,
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
        venueInformation.venuesObj[v.venue.id] = {
          name: v.venue.name,
          address: v.venue.location.formattedAddress
        }
      }

      var venueIdArr = Object.keys(venueInformation.venuesObj);

      return Promise.all(venueIdArr.map(item => [
        getNextVenue(item), getVenuePic(item)
      ]).flat())
    })
    .then(returnArray => {
      for (let i = 0; i < returnArray.length; i++) {
        addVenueDetails(returnArray[i]);
      };

      displayResults(venueInformation);
    })
    .catch(err => {
      $('#results-list').empty();
      if (err.message == 429) {
        $('#js-error-message').text(`Try again in 1 hour. Sorry -- to keep this service free we have to limit the number of search requests.`);
      } else if (err.message == 400) {
        $('#js-error-message').text('We don\'t have any information for that place/venue.');
      } else if (err.message == 500) {
        $('#js-error-message').text('Our bad -- our server is grumpy. Please try your request again later.');
      } else if (err.message == 401 | err.message == 403) {
        $('#js-error-message').text('This request is not authorized.');
      } else {
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
    $('#js-query-input').empty();
    $('#js-error-message').empty();

    event.preventDefault();
    const location = $('#js-search-city').val();
    const cuisine = $('#js-search-query').val();

    venueInformation['location'] = $('#js-search-city').val();
    venueInformation['cuisine'] = $('#js-search-query').val();
    venueInformation['venuesObj'] = {};

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
