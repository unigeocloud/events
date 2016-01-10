/**********************************************************************
 * map.js                                                             *
 * script for map specific functions and setup                        *
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

	$Id: map.js.en 835 2015-10-01 11:43:37Z kasper $
*/

/* add station marker */
function addStationMarker(id, lat, lng, station) {
	var marker = L.triangleMarker(L.latLng(lat, lng),
		{
			gradient: true,
			fillColor: config['station']['markerColor'],
			fillOpacity: config['station']['markerOpacity'],
			color: config['station']['markerColor'],
			weight: 1,
			opacity: 1,
			radius: config['station']['markerSize'][id] || config['station']['markerSize']['defaultSize'],
			className: id+' stationMarker',
		});
	marker.bindLabel('Station '+station);
	stationLayer.addLayer(marker);
	stationTable[id] = marker;
};

/* add event marker */
function addEventMarker(id, lat, lng, mag, type) {
	if ( eventTable[id] ) {
		return eventTable[id];
	} else {
		var markerOptions = {
			gradient: true,
			dropShadow: false,
			fillColor: config['event']['markerColor'],
			fillOpacity: config['event']['markerOpacity'],
			color: config['event']['markerColor'],
			weight: 0,
			opacity: 1,
			className: id+' eventMarker',
			radius: mag2radius(mag)
		};
		var marker;
		switch ( type ) {
			case 'earthquake':
				marker = L.starMarker(L.latLng(lat, lng), markerOptions);
				break;
			case 'explosion':
				markerOptions['numberOfSides'] = 6;
				markerOptions['radius'] = 2.0*markerOptions['radius'];
				markerOptions['innerRadius'] = 0.3*markerOptions['radius'];
				marker = L.regularPolygonMarker(L.latLng(lat, lng), markerOptions);
				break;
			case 'quarry blast':
				markerOptions['numberOfPoints'] = 7;
				markerOptions['innerRadius'] = 0.3*markerOptions['radius'];
				marker = L.starMarker(L.latLng(lat, lng), markerOptions);
				break;
			default:
				marker = L.circleMarker(L.latLng(lat, lng), markerOptions);
		};
		eventLayer.addLayer(marker);
		eventTable[id] = marker;
		return marker;
	};
};

/* handle to show events on map */
function initMapLink() {
	$("#eventstable > tbody > tr > td > a.map-link").off('click');
	$("#eventstable > tbody > tr > td > a.map-link").on('click' , function(){
		var highlightStyle = {
			color: config['event']['markerColorH'],
			fillColor: config['event']['markerColorH'],
			fillOpacity: 1,
			className: $(this).attr('eventid')
		}
		var normalStyle = {
			fillColor: config['event']['markerColor'],
			fillOpacity: config['event']['markerOpacity'],
			color: config['event']['markerColor']
		};
		// mark currently selected link and remove class selected from all other links
		// set everything to normal state
		$(this).addClass('selected-now');
		$("#eventstable > tbody > tr:not(.filtered) > td > a.map-link:not(.selected-now)").each(function(){
			$(this).removeClass('selected');
			$(this).text('Map');
			eventTable[$(this).attr('eventid')].setStyle(normalStyle);
		});
		// switch event of first row to normalStyle if it is not the selected one
		( $(this).hasClass('first') ) ? null : eventTable[$("#eventstable > tbody > tr:not(.filtered)").first().find("a.map-link").attr("eventid")].setStyle(normalStyle);
		$(this).each(function(){
			$(this).removeClass('selected-now');
			// selected -> unselected
			if ( $(this).hasClass('selected') ) {
				$(this).removeClass('selected');
				$(this).text('Map');
				map.setView(config['map']['centerDefault'], config['map']['zoomDefault']);
				eventTable[$(this).attr('eventid')].setStyle(normalStyle);
				highlightFirstEvent();
			// unselected -> selected
			} else {
				$(this).addClass('selected');
				$(this).text('at focus (red)');
				map.setView(eventTable[$(this).attr('eventid')].getLatLng(), config['map']['zoomFocus']);
				eventTable[$(this).attr('eventid')].setStyle(highlightStyle)
			};
		});
		return false;
	});
};

/**********************************************************************
 * document ready                                                     *
 **********************************************************************/
$(document).ready(function() {

	// create a map in the "map" div, set the view to a given place and zoom
	map = L.map('map', { zoomControl: false, worldCopyJump: true }).setView(config['map']['centerDefault'], config['map']['zoomDefault']);
	new L.Control.Zoom({ position: 'topright' }).addTo(map);
	new L.control.scale({position: 'bottomright', imperial: false}).addTo(map);

	// create baselayer
	switch ( config['map']['baselayer'] ) {
	case 'osmde': // add OpenStreetMap.DE tile layer
		L.tileLayer('http://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png',
		{
			attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
		}).addTo(map);
		break;
	case 'esrigray': // add ESRI Grayscale World Map (neither city nor road names)
		L.tileLayer('//server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
		{
			attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
			maxZoom: 16
		}).addTo(map);
		break;
	case 'aerial': // add ESRI WordImagery tile layer
		L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
		{
			attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
		}).addTo(map);
		break;
	case 'komoot': // add OpenStreetMap.DE tile layer
		L.tileLayer('//www.komoot.de/tiles/{s}/{z}/{x}/{y}.png',
		{
			attribution: 'Map data &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a> | Tiles Courtesy of <a href="http://www.komoot.de/">Komoot</a>',
		}).addTo(map);
		break;
	case 'mapquestgray': // add MapQuestOSM tile layer
		L.tileLayer.grayscale('http://otile{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpg',
		{
			subdomains: '1234',
			detectRetina: true,
			attribution: 'Map data &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a> | Tiles Courtesy of <a href="http://www.mapquest.com/">MapQuest</a> <img src="https://developer.mapquest.com/content/osm/mq_logo.png">',
		}).addTo(map);
		break;
	case 'mapquest': // add MapQuestOSM tile layer
		null;
	default:
		L.tileLayer('http://otile{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpg',
		{
			subdomains: '1234',
			detectRetina: true,
			attribution: 'Map data &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a> | Tiles Courtesy of <a href="http://www.mapquest.com/">MapQuest</a> <img src="https://developer.mapquest.com/content/osm/mq_logo.png">',
		}).addTo(map);
	};

	// create station and event layer
	// stationLayer = L.geoJson().addTo(map);
//	stationLayer = new L.MarkerGroup().addTo(map);
	eventLayer = new L.MarkerGroup().addTo(map);

	// load events
//	ajaxLoadEvents('', '', '', 'events.xml');
	ajaxLoadEvents();
//	specialEvents.map(function(id) {
//		ajaxLoadEvents('', '', id)
//	});
	toggleFilteredMarkers();

	// bind popupopen event
	map.on('popupopen', function() {
		// convert date/time to localtime
		$("div.leaflet-popup span.utctime").each(function(){$(this).addClass("localtime").removeClass("utctime");$.localtime.formatObject($(this), "dd.MM.yyyy - HH:mm")});
		openMarkerID = $("div.leaflet-popup h3").attr("eventid");
		if ( openMarkerID ) {
			// update city in popup
			$("div.leaflet-popup h3").text(geolocationTable[openMarkerID]);
			// highlight event in table and show details
			// highlightEvent(eventid);
			$('#eventstable > tbody > tr > td > a.toggle').each(function() {
				if ( $(this).attr('eventid') == openMarkerID ) {
					$(this)[0].click();
				};
			});
		};
	});
	map.on('popupclose', function() {
		$('#eventstable > tbody > tr > td > a.toggle').each(function() {
			if ( $(this).attr('eventid') == openMarkerID ) {
				$(this)[0].click();
			};
		});
	});
});
