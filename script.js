
//var ridbApiKey = "51757596-4204-498b-a768-10846f885937"; 
// "dd9db9b8-cd8a-43be-906b-60b309490362";
// "f768af14-4499-4dee-9ed7-bca0d58fdf85";
 var ridbApiKey = "dd9db9b8-cd8a-43be-906b-60b309490362";

var openweathermapApiKey = "40c8ddef7d6dcf0fa45ee70ad6205851";
var myListArray = [];

if (localStorage.getItem("data") !== null) {
	myListArray = localStorage.getItem("data").split(",");
}
console.log(myListArray);

// Prefilter to allow access to protected HTTPS urls
// In ajax calls, add parameter crossDomain: true to enable
jQuery.ajaxPrefilter(function(options) {
	if (options.crossDomain && jQuery.support.cors) {
		options.url = "https://cors-anywhere.herokuapp.com/" + options.url;
	}
});

$(document).ready(function() {

	$("[href=\"#index\"]").click(function() {
		$("#results").empty();
		$('#results-nav').toggle(false);   
		$("#form-container").toggle(false);
		$('#index').toggle(true); 
		$('#inputs').empty(); 

		
		// $(".hero").html("<h1 class=\"title is-large\">Campsite of the Day</h1>");
	})

	$("[href=\"#state\"]").click(function() {
		$("#results").empty();
		$('#results-nav').toggle(true); 
		$("#form-container").toggle(true);
		$('#panel-heading').text('Search By State');  
		$('#index').toggle(false); 
		$('#inputs').empty(); 
		// $(".hero").html("<h1 class=\"title is-large\">Search by State</h1>");

		renderStateDropdown();
		renderSubmitBtn();
	});
	
	$("[href=\"#name\"]").click(function() {
		$("#results").empty();
		$('#results-nav').toggle(true);
		$("#form-container").toggle(true);
		$('#panel-heading').text('Name Search');  
		$('#index').toggle(false); 
		$('#inputs').empty(); 
		// $(".hero").html("<h1 class=\"title is-large\">Search by name</h1>");

		renderInputName();
		renderSubmitBtn();
	});

	$("[href=\"#city\"]").click(function() {
		$("#results").empty();
		$('#results-nav').toggle(true); 
		$("#form-container").toggle(true);
		$('#panel-heading').text('Search By City');  
		$('#index').toggle(false); 
		$('#inputs').empty(); 
		// $(".hero").html("<h1 class=\"title is-large\">Search by City</h1>");

		renderInputCity();
		renderSubmitBtn();
	});
	
	// Replace placeholderBtn with submit button ID
	$("#inputs").on("submit", function(e) {
		e.preventDefault();

		renderArray = []; 
		
		if ($("#nameInput").val()) {
			var name = $("#nameInput").val();
			
			searchParkName(name, 0);
			
		} else if ($("#cityInput").val()) {
			var city = $("#cityInput").val();
			
			$.ajax({
				url: "https://api.openweathermap.org/data/2.5/weather?q=" + city + "&appid=" + openweathermapApiKey,
				method: "GET"
			}).then(function(weatherData) {				
				lat = weatherData.coord.lat;
				lon = weatherData.coord.lon;
				searchCoords(lat, lon, 0);
			})
			
		} else {
			var state = $("#stateSelect").val();
			
			searchState(state, 0);
		}
		
	});
	
	// Dragging into mycampsite
	$(".hero").on("click", ".dragItem", function(){
		var listName = $(this).attr("data-facilityID");
		console.log(this);

		$(".dragItem").draggable({
			snap: ".dropSave" 
		});
		// Just using footer for now since we dont have any place to put in yet
		$(".footer").droppable({
		  drop: function( event, ui ) {
			myListArray.unshift(listName);
			myListArray = Array.from(new Set(myListArray));
			localStorage.setItem("data",JSON.stringify(myListArray));	
			console.log(myListArray);
		  }
		});
	});
	// My Campsite display pulling from localStorage
	$("[href=\"#my-campsites\"]").click(function() {
		$("#inputs").empty();
		$("#panel-heading").text("");
		$("#results-nav").toggle(true);
		$("#results").empty().attr('class', 'is-visible');
		$(".hero").html("<h1 class=\"title is-large\">My Campsites</h1>");
		var userData = localStorage.getItem("data");
		userData = JSON.parse(userData);

		for (var i=0; i< userData.length;i++){
			searchParkID(userData[i]);
		}
	});

	$("[href=\"#near-me\"]").click(function() {
		$("#results").empty();
		$('#results-nav').toggle(true); 
		$("#form-container").toggle(false);
		$('#panel-heading').text('Campsites Near You'); 
		$('#index').toggle(false); 
		$('#inputs').empty(); 
		// $(".hero").html("<h1 class=\"title is-large\">Campsites Near You</h1>");
		navigator.geolocation.getCurrentPosition(getCoords);

		function getCoords(position) {				
			searchCoords(position.coords.latitude, position.coords.longitude, 0);
		}
	});

	$("#results").on("click", ".panel-block", function() {
		$("#form-container").toggle(false);
		$('#inputs').empty(); 
		populateCampsiteInfo(this.getAttribute("data-facilityID"));
	});
});

// Function to search campsites in a specific state
function searchState(state, offset) {
	$.ajax({
		url: "https://ridb.recreation.gov/api/v1/facilities?state=" + state + "&offset=" + offset + "&full=true&apikey=" + ridbApiKey,
		method: "GET",
		crossDomain: true
	}).then(function(facilities) {
		var rec = facilities.RECDATA;
		var meta = facilities.METADATA;
		
		// Filter through facilities looking for only campsites
		filterForCampsites(rec);
		
		// Check if all results are avalible, if not, print more
		if ((meta.RESULTS.CURRENT_COUNT + offset) < meta.RESULTS.TOTAL_COUNT) {
			offset += meta.SEARCH_PARAMETERS.LIMIT;
			searchState(state, offset);
		}
	});
}
var renderArray = []; // To hold all names without refresh
// Function to search campsites with name/keyword/description/stay limit
function searchParkName(name, offset) {

	$.ajax({
		url: "https://ridb.recreation.gov/api/v1/facilities?query=" + name + "&offset=" + offset + "&full=true&apikey=" + ridbApiKey,
		method: "GET",
		crossDomain: true
	}).then(function(facilities) {
		var rec = facilities.RECDATA;
		var meta = facilities.METADATA;

		filterForCampsites(rec);
		
		if ((meta.RESULTS.CURRENT_COUNT + offset) < meta.RESULTS.TOTAL_COUNT) {
			offset += meta.SEARCH_PARAMETERS.LIMIT;
			searchParkName(name, offset);
		}
	})
	
}

// Function to search campsites near input city
function searchCoords(lat, lon, offset) {
	$.ajax({
		url: "https://ridb.recreation.gov/api/v1/facilities?latitude=" + lat + "&longitude=" + lon + "&offset=" + offset + "&full=true&apikey=" + ridbApiKey,
		method: "GET",
		crossDomain: true
	}).then(function(facilities) {
		var rec = facilities.RECDATA;
		var meta = facilities.METADATA;
		count = 1;  
		filterForCampsites(rec);
		
		
		if ((meta.RESULTS.CURRENT_COUNT + offset) < meta.RESULTS.TOTAL_COUNT) {
			offset += meta.SEARCH_PARAMETERS.LIMIT;
			searchCity(lat, lon, offset);
		}
	})
}


function filterForCampsites(rec) { 
	var array = []; 
	for (var i = 0; i < rec.length; i++) {
		var obj = {}; 
		if (rec[i].FacilityTypeDescription === "Campground") {
			obj.name = toTitleCase(rec[i].FacilityName); 
			obj.id = rec[i].FacilityID;
			console.log(obj); 
			 
		}
		if (Object.keys(obj).length === 0) {
			continue; 
		} 
				renderArray.push(obj); 
				console.log(array);

				

	}			
			
				renderResults(renderArray);
}	


function renderResults(array){
	renderArray = array; 
	$('#results').empty(); 
		$(renderArray).each(function(index){
			var data = $("<a>").addClass("panel-block")
													   .attr("data-facilityID", renderArray[index].id)
													   .text(renderArray[index].name);

					$('#results').append(data); 
			
			})

}

	
function populateCampsiteInfo(identification) {
	$.ajax({
		url: "https://ridb.recreation.gov/api/v1/facilities/" + identification + "?full=true&apikey=" + ridbApiKey,
		method: "GET",
		crossDomain: true
	}).then(function(campground) {
		console.log(campground);
		$("#results").empty();

		// $(".hero").html("<h1 class=\"title is-large\">" + campground.FacilityName + "</h1>");
		$('#panel-heading').text(campground.FacilityName); 

		$("#results").append($("<p>").html(campground.FacilityDescription));

		var addr = campground.FACILITYADDRESS[0];
		$("#results").append($("<p>").text("Address: " + addr.FacilityStreetAddress1 + " " + addr.AddressStateCode + ", " + addr.AddressCountryCode + " " + addr.PostalCode));

		$("#results").append($("<p>").html("Phone: " + campground.FacilityPhone + "    Online At: <a href=\"" + campground.LINK[0].URL + "\">" + campground.LINK[0].URL + "</a>"));

		campgroundWeather(campground.FacilityLatitude, campground.FacilityLongitude);
	});
}

function searchParkID(identification) {
	$.ajax({
		url: "https://ridb.recreation.gov/api/v1/facilities/" + identification + "?full=true&apikey=" + ridbApiKey,
		method: "GET",
		crossDomain: true
	}).then(function(campground) {
		$("#results").append($("<li>").addClass("column is-5")
													   .attr("data-facilityID", campground.FacilityID)
													   .text(campground.FacilityName));
	});
}

function campgroundWeather(lat, lon) {
	$.ajax({
		url: "https://api.openweathermap.org/data/2.5/onecall?lat=" + lat + "&lon=" + lon + "&appid=" + openweathermapApiKey,
		method: "GET"
	}).then(function(weatherObj) {
		console.log(weatherObj);

		$("#results").append($("<h2>").text("7 Day Forecast"));
		var weatherDiv = $("<div>");
		
		for (var i = 0; i < weatherObj.daily.length; i++) {
			weatherDiv.append($("<p>").text(moment.unix(weatherObj.daily[i].dt).format("M/D/YYYY")));
			weatherDiv.append($("<img>").attr("src", "http://openweathermap.org/img/wn/" + weatherObj.daily[i].weather[0].icon + ".png"));
			weatherDiv.append($("<p>").text("Temp: " + (Math.round(weatherObj.daily[i].temp.day * 10) / 10) + "° F"));
		}
		$("#results").append(weatherDiv);
	})
}

// Creat State Dropdown Function  
function renderStateDropdown() {
	var input = $("<select>").addClass("select")
		.attr("id","stateSelect");

		var states = ["AK", "AL", "AR", "AZ", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY"];
		for (var i = 0; i < states.length; i++) {
			$("<option>").text(states[i])
				.attr("value", states[i])
				.appendTo($(input));
		}
	var field = $('<div class="field">');
	field.html('<label class="label">Select a State</label>'); 
	field.append(input).appendTo('#inputs'); 
}

function renderSubmitBtn() {
	$("<button class='is-inline'>").addClass("button")
		.attr("type","submit")
		.attr("id","submitBtn")
		.text("Submit")
		.appendTo(".field");
}

//  Create Name Input Function
function renderInputName() {
	var input = $("<input>").addClass("input")
		.attr("type","text")
		.attr("placeholder","Search by Name")
		.attr("id","nameInput");
	var field = $('<div class="field">');
	field.html('<label class="label">Name of Campsite</label>'); 
	field.append(input).appendTo('#inputs'); 

}

function renderInputCity() {
	var input = $("<input>").addClass("input")
		.attr("type","text")
		.attr("placeholder","Search by City")
		.attr("id","cityInput");
	var field = $('<div class="field">');
	field.html('<label class="label">City</label>'); 
	field.append(input).appendTo('#inputs'); 
}


//Consistent Title Case for Names
function toTitleCase(str) {
	var lcStr = str.toLowerCase();
	return lcStr.replace(/(?:^|\s)\w/g, function(match) {
		return match.toUpperCase();
	});
}


