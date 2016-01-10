/**********************************************************************
 * misc.js                                                            *
 * script for unspecific functions and setup                          *
 **********************************************************************/

/*	License
	Copyright 2014 Kasper D. Fischer <kasper.fischer@rub.de>

	This program is free software: you can redistribute it and/or modify it
	under the terms of the GNU General Public License as published by the Free
	Software Foundation, either version 3 of the License, or (at your option)
	any later version.

	This program is distributed in the hope that it will be useful, but
	WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
	or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License
	for more details.

	You should have received a copy of the GNU General Public License along
	with this program. If not, see http://www.gnu.org/licenses/.

	$Id: misc.js 836 2015-10-01 11:53:10Z kasper $
*/

/* calculate marker radius from magnitude
 * both formulas have equal radii at mag=1.2 */
function mag2radius(mag) {
	return 2*mag;				// radius proportional to magagnitude
	// return 8.104*Math.pow(30,mag)	// radius proportional to energy
};

/* set height of eventlist div */
function setInfoHeight() {
	var height = $('div.map').height() - 36;
	$('div.info').height(height);
};

/* get region and regionID of a location */
function getLocation(lat, lng) {
	var region = false;
	var regionID;
	var regions = [
		['Monschau', 'Schleiden', 'Bad Münstereifel', 'Rheinland-Pfalz', 'Rheinland-Pfalz', 'Rheinland-Pfalz', 'Hessen', 'Hessen', 'Hessen', 'Hessen'],
		['Aachen', 'Zülpich', 'Euskirchen', 'Bonn', 'Rheinland-Pfalz', 'Rheinland-Pfalz', 'Hessen', 'Hessen', 'Hessen', 'Hessen'],
		['Geilenkirchen', 'Düren', 'Köln', 'Köln-Mülheim', 'Waldbröl', 'Freudenberg', 'Siegen', 'Hessen', 'Hessen', 'Hessen'],
		['Heinsberg', 'Mönchengladbach', 'Neuss', 'Solingen', 'Gummersbach', 'Olpe', 'Schmallenberg', 'Bad Berleburg', 'Hessen', 'Hessen'],
		['Nettetal', 'Krefeld', 'Düsseldorf', 'Wuppertal', 'Hagen', 'Iserlohn', 'Arnsberg', 'Brilon', 'Hessen', 'Hessen'],
		['Geldern', 'Moers', 'Duisburg', 'Essen', 'Dortmund', 'Unna', 'Soest', 'Büren', 'Marsberg', 'Warburg'],
		['Kleve', 'Wesel', 'Dorsten', 'Recklinghausen', 'Lünen', 'Hamm/Westfalen', 'Beckum', 'Lippstadt', 'Paderborn', 'Bad Driburg'],
		['Emmerich am Rhein', 'Bocholt', 'Borken', 'Coesfeld', 'Münster', 'Warendorf', 'Rheda-Wiedenbrück', 'Gütersloh', 'Detmold', 'Bad Pyrmont'],
		['The Netherlands', 'The Netherlands', 'Vreden', 'Ahaus', 'Steinfurt', 'Lengerich', 'Bad Ilburg', 'Bielefeld', 'Herford', 'Niedersachsen'],
		['The Netherlands', 'The Netherlands', 'The Netherlands', 'Niedersachsen', 'Rheine', 'Ibbenbüren', 'Niedersachsen', 'Lübbecke', 'Minden', 'Niedersachsen']
	];
	if ( lat >= 50.4 && lat < 52.4 && lng >= 6.0 && lng < 9.333333 ) {
		var latIndex = Math.floor((lat-50.4)*5); // 5 tiles per degree
		var lngIndex = Math.floor((lng-6.0)*3);  // 3 tiles per degree
		region = regions[latIndex][lngIndex];
	};
    if ( region != 'The Netherlands' ) {
            regionID = 5500-latIndex*200+lngIndex*2+2;
	};
	if ( lat >= 50.9 && lat < 51.1 && lng >= 5.666666 && lng < 6.0 ) {
		region = 'Selfkant';
		regionID = 5000;
	};
    return [ region, regionID ];
};

/* window resize */
$( window ).resize(function() {
	setInfoHeight();
});

/* parseQueryString */
function parseQueryString() {
	var query = (window.location.search || '?').substr(1),
		map   = {};
	query.replace(/([^&=]+)=?([^&]*)(?:&+|$)/g, function(match, key, value) {
		key.toLowerCase();
		(map[key] = map[key] || []).push(value);
	});
	return map;
}

/* create global vars */
var map;
var openMarkerID;
var eventTable = {};
var eventDetails = {};
var stationTable = {};
var config = {
	ajax: {
		timeout: 10000, // 10 seconds
//		eventURL: '/fdsnws/event/1/query',
		eventURL: 'http://service.iris.edu/fdsnws/event/1/query',
		dlsvURL: 'dlsv',
//		mseedURL: '/fdsnws/dataselect/1/query',
		mseedURL: 'http://service.iris.edu/fdsnws/dataselect/1/query',
		stationURL: '/fdsnws/station/1/query',
//		stationURL: 'http://service.iris.edu/fdsnws/station/1/query',
		nominatimURL: '//photon.komoot.de/reverse',
//		nominatimURL: '//service.iris.edu',
		timespan: 1,
	},
	event: {
		evaluationBlacklist: ['automatic', 'preliminary', 'rejected'],
		markerOpacity: 0.4,
		markerColor: 'blue',
		markerColorH: 'red',
		minMag: 1.2,
//		minMag: 3,
		minMagDelta: 0.1,
		typeWhitelist: ['earthquake', 'induced or triggered event'],
	},
	map: {
		zoomDefault: 2,
		zoomFocus: 12,
		centerDefault: [20.85, 7.0],
		timespan: 180,
		latlngDelta: 0.1,
	},
	station: {
		markerColor: 'darkgreen',
		markerOpacity: 1,
		markerSize: {
			defaultSize: 8,
			GE_IBBN: 10,
			GR_BUG: 10,
			GR_KAST: 10,
			NL_HGN: 3,
			NL_OPLO: 3,
			NL_VKB: 3,
			NL_WIT: 3,
			NL_WTSB: 3,
		},
		networkBlacklist: ['NL', 'X5'],
	},
	tab: {
		active: 0,
		disabled: [2],
		max: 4,
	},
};
var networkURL = {
	GE: 'http://dx.doi.org/10.14470/TR560404',
	GR: 'http://www.bgr.bund.de/DE/Themen/Erdbeben-Gefaehrdungsanalysen/Seismologie/Seismologie/Seismometer_Stationen/Stationsnetze/d_stationsnetz_node.html',
	NL: 'http://www.knmi.nl/seismologie/seismisch_network_knmi3.html',
};
var networkText = {
	GE: '<a href="'+networkURL['GE']+'" target="_blank">GEOFON</a> Program, GFZ Potsdam',
	GR: '<a href="'+networkURL['GR']+'" target="_blank">German Regional Seismic Network</a>, BGR Hannover',
	NL: '<a href="'+networkURL['NL']+'" target="_blank">Netherlands Seismic Network</a>, The Netherlands',
	RN: 'RuhrNet - Ruhr-University Bochum, Germany',
};
var bochumStation = ['BUG', 'IBBN', 'KERA', 'KARP'];

// FIX: firefox has no console
if (typeof console == "undefined") var console = { log: function() {} };

/**********************************************************************
 * document ready                                                     *
 **********************************************************************/
$(document).ready(function() {
	// parse query string
	var parameters = parseQueryString();
	if ( parameters['baselayer'] ) {
		config['map']['baselayer'] = parameters['baselayer'][0];
	};
	if ( Number(parameters['lat']) && Number(parameters['lon']) ) {
		config['map']['centerDefault'] = [Number(parameters['lat']), Number(parameters['lon'])];
	};
	if ( Number(parameters['minmag']) ) {
		config['event']['minMag'] = Number(parameters['minmag']);
	};
	if ( parameters['eventcolor'] ) {
		config['event']['markerColor'] = parameters['eventcolor'];
	};
	if ( parameters['eventcolorh'] ) {
		config['event']['markerColorH'] = parameters['eventcolorh'];
	};
	if ( parameters['stationcolor'] ) {
		config['station']['markerColor'] = parameters['stationcolor'];
	};
	if ( Number(parameters['timespan']) ) {
		config['map']['timespan'] = Number(parameters['timespan']);
	};
	if ( Number(parameters['tab']) ) {
		if ( Number(parameters['tab']) < config['tab']['max'] ) {
			config['tab']['active'] = Number(parameters['tab']);
		};
	};

	// AJAX setup
	$.ajaxSetup({timeout: config['ajax']['timeout']});

	// adjust height of infocontainer
	setInfoHeight();

	// create tabs
	$('#tabs').tabs({
		active: config['tab']['active'],
		disabled: config['tab']['disabled'],
		activate: function( event, ui ) { ui['newPanel'].find('table').trigger("update", [true]); },
	});
	// create accordions
	$( '#infoaccordion' ).accordion({
		active: 0,
		header: 'h3.aheader',
		heightStyle: 'content',
		animate: 200,
	});
	// spinner
	$(document).bind("ajaxSend", function() {
			$("#spinner").show();
	}).bind("ajaxStop", function() {
			$("#spinner").hide();
	});
});
