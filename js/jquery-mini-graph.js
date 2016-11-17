(function( $ ) {

  $.fn.drawMiniGraph = function(options) {
    var settings = $.extend({
      width: 400,
      height: 300,
      data: null,
      target: null
    }, options );

    if (settings.data != null) drawBarChartWithSVG(settings.target, settings.data, settings.width, settings.height);
    return this;
  };

}( jQuery ));

// by using D3.js, it displays document info obtained from the json-formatted file.
var drawBarChartWithSVG = function (target, data, w, h) {
  var margin = {top: 20, right: 40, bottom: 30, left: 20},
    width = w - margin.left - margin.right,
    height = h - margin.top - margin.bottom,
    barWidth = Math.floor(width / Object.keys(data).length) - 1;

  var x = d3.scale.linear()
    .range([barWidth / 2, width - barWidth / 2]);

  var y = d3.scale.linear()
    .range([height, 0]);

  var max = d3.map()
  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("right")
    .tickSize(-width)
    .tickFormat(function(d) { return Math.round(d / 1e6) + "M"; });

  var svg = d3.select(target)
    .append("svg")
    .attr("width", width )
    .attr("height", height )
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // svg.append("rect")
  //     .attr("x", 0)
  //     .attr("y", 0)
  //     .attr("width", width)
  //     .attr("height", height)
  //     .style("fill", 'white')
  svg.append("path")
    .attr("class", "x-axis")
    .attr("d", "M0 "+(height/2)+" L"+(width)+" "+(height/2))
    .style("stroke","black");

  svg.selectAll(".bar")
    .data(Object.keys(data))
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", function (d, i) { return x(i)-barWidth/2; })
    .attr("y", function (d, i) { return data[d] < 0 ? height/2 : height/2-10*data[d]; })
    .attr("width", barWidth)
    .attr("height", function (d, i) { return Math.abs(10*data[d]); })
    .style("fill", function (d, i) { return data[d] < 0 ? "blue" : "red"; });

  $(target).show(2000);
}