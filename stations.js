/**********************************************************************
 * stations.js                                                        *
 * script for station specific functions and setup                    *
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

	$Id: stations.js.en 834 2015-09-04 13:25:27Z kasper $
*/

/* Load the stations using ajax */
function loadStations(stime, etime) {
	var mapBounds = map.getBounds();
	var N = mapBounds.getNorth();
	var E = mapBounds.getEast();
	var S = mapBounds.getSouth();
	var W = mapBounds.getWest();
	if ( !stime ) {
		var stime = new Date();
		stime.setDate(stime.getDate()-config['map']['timespan']);
	};
	if ( !etime ) {
		var etime = new Date();
		etime.setDate(etime.getDate()+1);
	};
	var request_data = {
		endafter: sprintf("%d-%02d-%02d", stime.getFullYear(), stime.getMonth()+1, stime.getDate()),
		startbefore: sprintf("%d-%02d-%02d", etime.getFullYear(), etime.getMonth()+1, etime.getDate()),
		level: 'channel',
		minlat: S-config['map']['latlngDelta'],
		maxlat: N+config['map']['latlngDelta'],
		minlon: W-config['map']['latlngDelta'],
		maxlon: E+config['map']['latlngDelta'],
	};
	$.ajax({
		type: "GET",
		url: config['ajax']['stationURL'],
		dataType: "xml",
		data: request_data,
		success: function (xml) {
			$(xml).find('Network').each(function () {
				var network = $(this).attr('code');
				if ( $.inArray(network, config['station']['networkBlacklist'])<0 ) {
					$(this).find('Station').each(function () {
						var station = $(this).attr('code'),
							lat = $(this).find('Latitude:first').text(),
							lng = $(this).find('Longitude:first').text(),
							stationID = network+'_'+station,
							stationText = network+'.'+station;
						if ( !stationTable[stationID] ) {
							// general station info (1st line)
							var row = sprintf('<tr><td><a href="#" class="toggle">%s</a></td><td><a href="#" class="toggle">%s</a></td><td class="ar">%7.4f</td><td class="ar">%7.4f</td></tr>' , network, station, Number(lat), Number(lng));
							// setting up network details (2nd line)
							row += sprintf('<tr class="tablesorter-childRow station-details"><td colspan="4">%s', networkText[network] || '');
							row += ( $.inArray(station, bochumStation)+1 ) ? '<br /><em>Operator:</em> Ruhr-University Bochum</td></tr>' : '</td></tr>' ;
							if ( network == 'RN' || network == 'X5' || $.inArray(station, bochumStation)+1 ) {
								// setting up station details (3rd line)
								row += '<tr class="tablesorter-childRow station-details"><td colspan="4">';
								row += stationDetails(station, network, lat, lng, stationID, stationText, $(this));
								row += '</td></tr>';
								// setting up download links (4th line)
								var URL, fdsnxmlURL, fdsnxmlRespURL, sc3mlURL, sc3mlRespURL, dlsvURL;
								URL = sprintf('%s?network=%s&station=%s', config['ajax']['stationURL'], network, station);
								fdsnxmlURL = URL + '&level=station&format=xml';
								fdsnxmlRespURL = URL + '&level=response&format=xml';
								sc3mlURL = URL + '&level=station&format=sc3ml';
								sc3mlRespURL = URL + '&level=response&format=sc3ml';
								dlsvFile = sprintf('%s_%s.dlsv', network.toUpperCase(), station.toUpperCase());
								row += '<tr class="tablesorter-childRow station-download"><td colspan="4">'
									+ sprintf('Download details: <a download="%s.xml" href="%s" target="_blank">FDSNxml</a> or <a download="%s.sc3" href="%s" target="_blank">SC3ml</a><br /> ', stationID, fdsnxmlURL, stationID, sc3mlURL)
									+ sprintf('Response files:  <a download="%s_response.xml" href="%s" target="_blank">FDSNxml</a>, <a download="%s_response.sc3" href="%s" target="_blank">SC3ml</a> ', stationID, fdsnxmlRespURL, stationID, sc3mlRespURL)
									+ sprintf('or <a href="%s" download="%s" type="application/octet-stream">datalessSEED</a>', config['ajax']['dlsvURL'] + '/' + dlsvFile, dlsvFile.toLowerCase())
									+ '</td></tr>';
							}
							else {
								row += '<tr class="tablesorter-childRow station-details"><td colspan="4">Kontaktieren Sie den ';
								row += ( networkURL[network.toUpperCase()] ) ? '<a href="'+networkURL[network.toUpperCase()]+'" target="_blank">Netzwerkkoordinator</a>' : 'Netzwerkkoordinator';
								row += ' für weitere Details.</td></tr>';
							};
							$('#stationstable tbody').append(row);
							addStationMarker(stationID, Number(lat), Number(lng), stationText.toUpperCase());
						};
					});
				};
			});
		},
		complete: function () {
			initStationTable();
			var sort = [[0,0],[1,0]];
			$("#stationstable").trigger("update", [true]);
			$("#stationstable").trigger("updateCache");
			$("#stationstable").trigger("sorton", [sort]);
			$("#stationstable > tbody > tr:even").addClass("odd");
			$("#stationstable > tbody > tr:odd").addClass("even");
			stationLayer.bringToFront();
		},
		error: function( jqxhr, textStatus, error ) {
			var err = textStatus + ", " + error;
			console.log( "Request Failed: " + err );
		}
	});
	// create stations csv download link
	request_data['format'] = 'text';
	$('#stations-csv-link').attr('href', config['ajax']['stationURL']+'?'+$.param(request_data));
};

/* format station Details */
function stationDetails(station, network, lat, lng, stationId, stationText, stationObject) {
	var output;
	var elevation = stationObject.find('Elevation:first').text();
	var name = stationObject.find('Site > Name').text();
	output = '<pre>'
		+ name + '<br />'
		+ 'Position: ' + lat + '°N ' + lng + '°E, height: ' + elevation + ' m a.s.l.<br />';
	stationObject.find('Channel').each(function() {
		var code = $(this).attr('code');
		var sensor = $(this).find('Sensor > Type').text().split(',')[0];
		var sampleRate = $(this).find('SampleRate').text();
		output += '<br />Chanel ' + code + ', Samplingrate ' + sampleRate + ' Hz, Sensor ' + sensor;
	});
	output += '</pre>';
	return output;
};

/* initStationTable */
function initStationTable() {
	// tablesorter for station list
	$("#stationstable").tablesorter(
		{
			theme : 'blue',
			cssChildRow: "tablesorter-childRow", // this is the default setting
			widgets: ["uitheme", "zebra", "filter", "pager"], // initialize zebra and filter widgets, "scroller"
			widgetOptions: {
				// output default: '{page}/{totalPages}'
				// possible variables: {page}, {totalPages}, {filteredPages}, {startRow}, {endRow}, {filteredRows} and {totalRows}
				pager_output: '# {startRow} - {endRow} ({totalRows}) | page {page} ({totalPages})',
				// apply disabled classname to the pager arrows when the rows at either extreme is visible
				pager_updateArrows: true,
				// starting page of the pager (zero based index)
				pager_startPage: 0,
				// Number of visible rows
				pager_size: 35,
				// Save pager page & size if the storage script is loaded (requires $.tablesorter.storage in jquery.tablesorter.widgets.js)
				pager_savePages: true,
				// if true, the table will remain the same height no matter how many records are displayed. The space is made up by an empty
				// table row set to a height to compensate; default is false
				pager_fixedHeight: false,
				// remove rows from the table to speed up the sort of large tables.
				// setting this to false, only hides the non-visible rows; needed if you plan to add/remove rows with the pager enabled.
				pager_removeRows: false,
				// css class names of pager arrows
				pager_css: {
					container   : 'stations-tablesorter-pager',
					errorRow    : 'stations-tablesorter-errorRow', // error information row (don't include period at beginning)
					disabled    : 'disabled'              // class added to arrows @ extremes (i.e. prev/first arrows "disabled" on first page)
				},
				// jQuery pager selectors
				pager_selectors: {
					container   : '.stationspager',       // target the pager markup (wrapper)
					first       : '.stationsfirst',       // go to first page arrow
					prev        : '.stationsprev',        // previous page arrow
					next        : '.stationsnext',        // next page arrow
					last        : '.stationslast',        // go to last page arrow
					goto        : '.stationsgotoPage',    // go to page selector - select dropdown that sets the current page
					pageDisplay : '.stationspagedisplay', // location of where the "output" is displayed
					pageSize    : '.stationspagesize'     // page size selector - select dropdown that sets the "size" option
				},

				filter_childRows  : true,
				filter_cssFilter  : 'stations-tablesorter-filter',
				filter_startsWith : false,
				filter_ignoreCase : true,
				scroller_height: $('div.map').height() - 250,
				scroller_barWidth: 10,
				scroller_jumpToHeader: false,
				sortList: "[[0,0], [1,0]]",
				resort: true,
				showProcessing: true,
			}
		});
	// hide child rows
	$('#stationstable > tbody > tr.tablesorter-childRow > td').hide();
	// update map after filtering
	// $('#stationsstable').bind('filterEnd', function(){
	//	toggleFilteredMarkers();
	// });
};

/**********************************************************************
 * document ready                                                     *
 **********************************************************************/
$(document).ready(function() {
	loadStations();
	// show / hide station info
	$('#stationstable').delegate('.toggle', 'click' , function(){
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
				//highlightFirstEvent();
			} else {
				$(this).addClass('selected');
				//toggleHighlightStation($(this).attr('stationid'));
			};
		});
		return false;
	});
});
