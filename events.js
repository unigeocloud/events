/**********************************************************************
 * events.js                                                          *
 * script for event specific functions and setup                      *
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

	$Id: events.js.en 836 2015-10-01 11:53:10Z kasper $
*/

/* adding row(s) to a table and format date strings afterwards */
function addTableRow(row, table) {
	var added = $('#'+table+' tbody').append(row);
	added.find('.tablesorter-childRow td').hide();
	$('#'+table).find('td.utctime-date').each(function() {
		$.localtime.formatObject($(this), "dd.MM.yyyy");
		$(this).removeClass('utctime-date');
		$(this).addClass('localtime-date');
	});
	$('#'+table).find('td.utctime-time').each(function() {
		$.localtime.formatObject($(this), "HH:mm:ss");
		$(this).removeClass('utctime-time');
		$(this).addClass('localtime-time');
	});
};

/* do reverse geolocation lookup */
function getGeolocation(id, lat, lng) {
	if ( !geolocationTable[id] ) {
		$.getJSON( config['ajax']['nominatimURL'], { lat: lat, lon: lng } )
			.done(function( json ) {
				var city = json.features[0].properties.city;
				var countryCode = json.features[0].properties.country;
				geolocationTable[id] = city;
				( countryCode != "Germany" ) ? geolocationTable[id] = geolocationTable[id] + " ("+countryCode+")" : null;
				if ( city ) {
					$("#eventstable a.toggle[eventid="+id+"]").text(geolocationTable[id]);
					var sort = [[0,1],[1,1],[2,1]];
					$("#eventstable").trigger("update", [true]);
					$("#eventstable").trigger("updateCache");
					$("#eventstable").trigger("sorton", [sort]);
				} else {
					// console.log("Nominatim did not provide a city tag for "+lat+" / "+lng);
				};
			})
			.fail(function( jqxhr, textStatus, error ) {
				var err = textStatus + ", " + error;
				console.log( "Request Failed: " + err );
		});
	};
};

/* Load events using ajax */
function ajaxLoadEvents(stime, etime, eventid, url, target) {
	var mapBounds = map.getBounds();
	var request_data = {};
	var rtime;
	var ajax_url = config['ajax']['eventURL'];
	if ( stime == '' || !stime ) {
		stime = new Date();
		stime.setDate(stime.getDate()-config['map']['timespan']);
		rtime = new Date();
		rtime.setDate(rtime.getDate()-Math.min(config['ajax']['timespan'], config['map']['timespan']));
	} else {
		rtime = stime;
	};
	if ( url ) {
		var ajax_url = url;
		request_data = {};
	} else {
		if ( eventid ) {
			request_data = { eventid: eventid };
		} else {
			request_data = {
				starttime: sprintf("%d-%02d-%02d", rtime.getFullYear(), rtime.getMonth()+1, rtime.getDate()),
				orderby: 'time-asc',
//				minlat: sprintf('%.2f', mapBounds.getSouth()-config['map']['latlngDelta']),
//				maxlat: sprintf('%.2f', mapBounds.getNorth()+config['map']['latlngDelta']),
				minlat: sprintf('%.2f', -89),
				maxlat: sprintf('%.2f', 89),
// 				minlon: sprintf('%.2f', mapBounds.getWest()-config['map']['latlngDelta']),
//				maxlon: sprintf('%.2f', mapBounds.getEast()+config['map']['latlngDelta']),
				minlon: sprintf('%.2f', -179),
				maxlon: sprintf('%.2f', 179),
				minmag: sprintf('%.1f', config['event']['minMag']-config['event']['minMagDelta']),
			};
			if ( etime ) {
				request_data['endtime'] = sprintf("%d-%02d-%02d", etime.getFullYear(), etime.getMonth()+1, etime.getDate());
			};
		};
	};
	if ( etime == '' || !etime  ) { etime = new Date(); };
	$.ajax({
		type: "GET",
		url: ajax_url,
		data: request_data,
		dataType: "xml",
		success: function (xml) {
			$(xml).find('event').each(function () {
				var id = $(this).attr('publicID').split('=')[1];
				var mag = $(this).find('magnitude > mag > value').text();
				var otime = $(this).find('origin > time > value').text();
				var lng = $(this).find('origin > longitude > value').text();
				var lat = $(this).find('origin > latitude > value').text();
				var depth = $(this).find('origin > depth > value').text();
				var evaluationMode = $(this).find('origin > evaluationMode').text();
				var evaluationStatus = $(this).find('origin > evaluationStatus').text();
				var type = $(this).find('type').last().text();
				var location = $(this).find('description > text').text();
				//	var location = $(this).find('origin > latitude > value').text();
				// get location, try this in order:
				// regional map name, given value, cached value,  or nominatim lookup
//				geolocationTable[id] ? null : getGeolocation(id, lat, lng); // do AJAX lookup if not cached, location will be updated later
//				location = ( geolocationTable[id] || getLocation(lat, lng)[0] || $(this).find('description > text').text() );
				// create table row: Date, Time, Mag, Location
//				if ( !eventTable[id] && $.inArray(type, config['event']['typeWhitelist'] )+1 && $.inArray(evaluationStatus, config['event']['evaluationBlacklist'])<0 && Number(mag)+0.05 >= config['event']['minMag'] ) {
					// general event info (1st line)

					var row = '<tr class="tablesorter-hasChildRow">'
							+ '<td class="utctime-date">'+otime.split('.')[0]+'Z</td>'
							+ '<td class="utctime-time">'+otime.split('.')[0]+'Z</td>'
							+ sprintf('<td class="ar">%.1f</td>', Number(mag))

							+ '<td><a href="#" class="toggle" eventid="'+id+'">'+location+'</a><a class="map-link" href="#" eventid="'+id+'">map</a></td>'
//							+ '<td><a href="#" class="toggle" eventid="'+id+'">'+location+'</a> <a class="map-link" href="#" eventid="'+id+'">map</a></td>'

							+ '</tr>';
					// setting up event details (2nd line)

//					row += '<tr class="tablesorter-childRow event-details">'
//						+ '<td colspan="4" eventid="'+id+'">Loading data ...</td></tr>';

					// setting up download links (3nd line)

//					var xmlurl = sprintf('%s?formatted=true&includearrivals=true&eventid=%s', config['ajax']['eventURL'], id);
					var xmlurl = sprintf('%s?includearrivals=true&eventid=%s', config['ajax']['eventURL'], id);

					var oTime = new Date(otime);
					if ( ~oTime ) {
						oTime = new Date(otime.split('.')[0]);
					};
					var sTime = new Date(oTime.getTime()-10*1000.-oTime.getMilliseconds());
					var eTime = new Date(oTime.getTime()+50*1000.-oTime.getMilliseconds());
					var mseedurl = sprintf('%s?net=GE,GR,RN&cha=EH?,HH?&start=%04d-%02d-%02dT%02d:%02d:%02d&end=%04d-%02d-%02dT%02d:%02d:%02d', config['ajax']['mseedURL'], Number(sTime.getUTCFullYear()), Number(sTime.getUTCMonth())+1, Number(sTime.getUTCDate()), Number(sTime.getUTCHours()), Number(sTime.getUTCMinutes()), Number(sTime.getUTCSeconds()), Number(eTime.getUTCFullYear()), Number(eTime.getUTCMonth())+1, Number(eTime.getUTCDate()), Number(eTime.getUTCHours()), Number(eTime.getUTCMinutes()), Number(eTime.getUTCSeconds()));

					row +=  '<tr class="tablesorter-childRow event-download">'
						+ '<td colspan="4" eventid="'+id+'">'
//						+ sprintf('Download <a class="xml-link" target="_blank" download="%s.xml" href="%s">QuakeML</a> or <a class="mseed-link" target="_blank" download="%s.mseed" href="%s">miniSEED</a>', id, xmlurl, id, mseedurl)
						+ '</td></tr>';
					// add row to table

					if ( stime <= oTime && etime >= oTime ) {
						addTableRow(row, 'eventstable');
					};

					if ( target ) {
						addTableRow(row, target);
					}

					// create marker
					if ((stime <= oTime && etime >= oTime ) || ( id == eventid )) {
						var marker = addEventMarker(id, Number(lat), Number(lng), Number(mag), type);
						var text = sprintf('<h3 eventid="%s">%s</h3>', id, location)
								+ sprintf('Date:   <span class="utctime">%sZ</span><br />', otime.split('.')[0], otime.split('.')[0])
								+ sprintf('LatLon: %.4f, %.4f <br />', Number(lat), Number(lng))
								+ sprintf('Depth:  %.1f km<br />', Number(depth)/1000.)
								+ sprintf('Mag.:   %3.1f<br />', Number(mag))
								+ sprintf('Type:   %s<br />', type);

		//						+ sprintf('Zeit: <span class="utctime">%sZ</span></p>', otime.split('.')[0], otime.split('.')[0]);
						marker.bindPopup(text);
					};
//				};
			});
		},
		complete: function () {
			var sort = [[0,1],[1,1],[2,1]];
			$("#eventstable").trigger("update", [true]);
			$("#eventstable").trigger("updateCache");
			$("#eventstable").trigger("sorton", [sort]);
			initMapLink();
			eventLayer.bringToBack();
			highlightFirstEvent();
		},
		error: function( jqxhr, textStatus, error ) {
			var err = textStatus + ", " + error;
			console.log( "Request Failed: " + err );
		}
	});
	// create events csv download link
	request_data['format'] = 'text';
	if ( eventid == '' || !eventid ) { $('#events-csv-link').attr('href', config['ajax']['eventURL']+'?'+$.param(request_data)) };
};

/* ajaxLoadEventInfo */
function ajaxLoadEventInfo(id) {
	var request_data = {
		eventid: id,
		includeArrivals: true,
	};
	$.ajax({
		type: "GET",
		url: config['ajax']['eventURL'],
		data: request_data,
		dataType: "xml",
		success: function (xml) {
			eventDetails[id] = true;
			$(xml).find('event').each(function () {
				var event = $(this);
				var mag = $(this).find('magnitude > mag > value').text();
				var otime = $(this).find('origin > time > value').text();
				var lng = $(this).find('origin > longitude > value').text();
				var lng_err = $(this).find('origin > longitude > uncertainty').text();
				var lat = $(this).find('origin > latitude > value').text();
				var lat_err = $(this).find('origin > latitude > uncertainty').text();
				var depth = $(this).find('origin > depth > value').text();
				var depth_err = $(this).find('origin > depth > uncertainty').text();
				var rms = $(this).find('origin > quality > standardError').text();
				var gap = $(this).find('origin > quality > azimuthalGap').text();
				var phases_count = $(this).find('origin > quality > usedPhaseCount').text();
				var type = $(this).find('type').last().text();
				// setting up general event info
				var row = "<pre>"
					+ sprintf("ID %49s\n", id)
					+ sprintf("Type %47s\n\n", type)
					+ "Origin\n"
					+ sprintf("Date %18s\n", otime.split('T')[0])
					+ sprintf("Time %18s UTC\n", otime.split('T')[1].substring(0, 11))
					+ sprintf("Latitude %14.4f °N +- %4.1f km\n",Number(lat), Number(lat_err))
					+ sprintf("Longitude %13.4f °E +- %4.1f km\n", Number(lng), Number(lng_err))
					+ sprintf("Depth %14.1f    km +- %4.1f km\n", Number(depth)/1000., Number(depth_err)/1000.)
					+ sprintf("Magnitude %10.1f\n", Number(mag))
					+ sprintf("Residual RMS %7.1f    sec\n", Number(rms))
					+ sprintf("Azimuthal gap %6.1f    °\n\n", Number(gap))
					+ sprintf("%d Phase arrivals:\n", Number(phases_count))
					+ "sta  net  dist azi     phase time         res   wt\n";
				// adding phase info (TODO sort by distance)
				$(this).find('origin > arrival').each(function() {
					var pickid = $(this).find('pickID').text();
					var azi = $(this).find('azimuth').text();
					var dist = $(this).find('distance').text();
					var tres = $(this).find('timeResidual').text();
					var phase = $(this).find('phase').text();
					var tweight = $(this).find('timeWeight').text();
					if ( Number(tweight) > 0.0 ) {
						var waveformid = event.find('pick[publicID="'+pickid+'"] > waveformID');
						var networkcode = waveformid.attr('networkCode');
						var stationcode = waveformid.attr('stationCode');
						var channel = waveformid.attr('channelCode').substring(2,2);
						var phasemode = event.find('pick[publicID="'+pickid+'"] > evaluationMode').text().substring(0,1).toUpperCase();
						var picktime = event.find('pick[publicID="'+pickid+'"] > time > value').text().split('T')[1].substring(0,11);
						row = row
							+ sprintf('%-4s %2s  %5.1f %5.1f %3s %1s %13s %5.1f %5.2f\n', stationcode, networkcode, Number(dist), Number(azi), phase, phasemode, picktime, Number(tres), Number(tweight));
					};
				});
				row = row + '</pre>';
				$('#eventstable > tbody > tr.event-details > td[eventid='+id+']').html(row);
			});
		},
		complete: function () {
			null;
		},
		error: function( jqxhr, textStatus, error ) {
			var err = textStatus + ", " + error;
			console.log( "Request Failed: " + err );
		}
	});
};

/* toggles visibility of filtered markers
 * only events in the event list are shown */
function toggleFilteredMarkers() {
	// show all shown events in map
	$("#eventstable > tbody > tr:not(.filtered) > td > a.map-link").each( function() {
		if ( $(this).attr("eventid") ) {
			map.addLayer(eventTable[$(this).attr("eventid")]);
		};
	});
	// hide filtered events in map
	$("#eventstable > tbody > tr.filtered > td > a.map-link").each( function() {
		if ( $(this).attr("eventid") ) {
			map.removeLayer(eventTable[$(this).attr("eventid")]);
		};
	});
	highlightFirstEvent();
};

/* Highlight the first event of the event list on the map if no
 * other event is selected                                      */
function highlightFirstEvent() {
	var highlightStyle = {
		color: config['event']['markerColorH'],
		fillColor: config['event']['markerColorH'],
		fillOpacity: 1,
	};
	var normalStyle = {
		fillColor: config['event']['markerColor'],
		color: config['event']['markerColor'],
		fillOpacity: config['event']['markerOpacity'],
	};
	$("#eventstable a.map-link").each( function() {
		if ( $(this).attr("eventid") ) {
			eventTable[$(this).attr("eventid")].setStyle(normalStyle);
			$(this).removeClass('first');
//			$(this).text('map');
		};
	});
	$("#eventstable > tbody > tr:not(.filtered):visible").first().find("a.map-link").each(function() {
		if ( $(this).attr("eventid") ) {
			eventTable[$(this).attr("eventid")].setStyle(highlightStyle);
			eventTable[$(this).attr("eventid")].bringToFront();
			$(this).addClass('first');
//			$(this).text('map (red)');
		};
	});
};

function highlightEvent( id ) {
	var highlightStyle = {
		color: config['event']['markerColorH'],
		fillColor: config['event']['markerColorH'],
		fillOpacity: 1,
	};
	var normalStyle = {
		fillColor: config['event']['markerColor'],
		color: config['event']['markerColor'],
		fillOpacity: config['event']['markerOpacity'],
	};
	$("#eventstable > tbody > tr:not(.filtered)").find("a.map-link").each( function() {
		if ( $(this).attr("eventid") ) {
			if ( $(this).attr("eventid") == id ) {
				eventTable[$(this).attr("eventid")].setStyle(highlightStyle);
				eventTable[$(this).attr("eventid")].bringToFront();
				$(this).addClass('first');
				$(this).text('map (red)');
			} else {
				eventTable[$(this).attr("eventid")].setStyle(normalStyle);
				$(this).removeClass('first');
//				$(this).text('map');
			}
		};
	});
};

/**********************************************************************
 * document ready                                                     *
 **********************************************************************/
$(document).ready(function() {
	// tablesorter for event list
	$("#eventstable").tablesorter(
		{
			theme : 'blue',
			dateFormat : "ddmmyyyy",
			headers: {
				0: { sorter: "shortDate" }
			},
			cssChildRow: "tablesorter-childRow", // this is the default setting
			widgets: ["uitheme", "zebra", "filter", "pager"], // initialize zebra and filter widgets, "scroller"
			widgetOptions: {
				// possible variables: {page}, {totalPages}, {filteredPages}, {startRow}, {endRow}, {filteredRows} and {totalRows}
				pager_output: '# {startRow} - {endRow} ({totalRows}) | page {page} ({totalPages})',
				pager_removeRows: false,
				pager_size: 35,
				filter_childRows  : true,
				filter_cssFilter  : 'tablesorter-filter',
				filter_startsWith : false,
				filter_ignoreCase : true,
				scroller_height: $('div.map').height() - 250,
				scroller_barWidth: 10,
				scroller_jumpToHeader: false,
				sortList: "[[0,1], [1,1], [2,1]]",
				resort: true,
				showProcessing: true,
			}
		});
	// hide child rows
	$('#eventstable > tbody > tr.tablesorter-childRow td').hide();
	// update map after filtering
	$('#eventstable').bind('filterEnd', function(){
		toggleFilteredMarkers();
	});
	// highlight first event
	$('#eventstable').bind('sortEnd', function(){
		highlightFirstEvent();
	});
	$('#eventstable').bind('pagerComplete', function(){
		highlightFirstEvent();
	});
	// show / hide event info
	$('#eventstable').delegate('.toggle', 'click' , function(){
		// load event details
		var eventid = $(this).attr('eventid');
		( eventDetails[eventid] ) ? null : ajaxLoadEventInfo(eventid);

		// toggle visibility of selected row
		$(this).closest('tr').nextUntil('tr.tablesorter-hasChildRow').find('td').toggle('slow');
		// mark currently selected row and remove class selected from all other rows
		// hide other rows
		$(this).closest('tr').nextUntil('tr.tablesorter-hasChildRow').find('td').addClass('selected-now');
		$(this).closest('tbody').find('td.selected').each(function(){
			if ( ! $(this).hasClass('selected-now') ) {
				$(this).hide();
				$(this).removeClass('selected');
			};
		});
		$(this).closest('tr').nextUntil('tr.tablesorter-hasChildRow').find('td').each(function(){
			$(this).removeClass('selected-now');
			var selected = $(this).hasClass('selected');
			if ( selected ) {
				$(this).removeClass('selected');
				highlightFirstEvent();
			} else {
				$(this).addClass('selected');
				highlightEvent($(this).attr('eventid'));
			};
		});
		return false;
	});
	// update selection / type info
	$("#events-timespan").text(config['map']['timespan']);
	$("#events-minmag").text(sprintf('%.1f', config['event']['minMag']));
	config['event']['typeWhitelist'].map(function(type) {
		var typetext;
		( $("#events-type").text() == "Symbols:" ) ? typetext = ' ' : typetext = ', ';
		switch ( type ) {
			case 'earthquake':
				typetext += 'tectonic earthquake&nbsp;(star)';
				break;
			case 'explosion':
				typetext += 'explosion&nbsp;(hexagon)';
				break;
			case 'induced or triggered event':
				typetext += '(mining-)induced event&nbsp;(circle)';
				break;
			case 'quarry blast':
				typetext += 'quarry blast&nbsp;(wheel)';
				break;
		};
		$("#events-type").append(typetext);
	});
});
