d3.keggMenu = function (menu, openCallback) {
	
  // create the div element that will hold the kegg menu
  d3.selectAll('.d3-kegg-menu').data([1])
    .enter()
    .append('div')
    .attr('class', 'd3-kegg-menu');

  // close menu
  d3.select('body').on('click.d3-kegg-menu', function() {
    d3.select('.d3-kegg-menu').style('display', 'none');
  });

  // this gets executed when a keggmenu event occurs
  return function(data, index) {
    var elm = this;
    console.log("Kegging");
    d3.selectAll('.d3-kegg-menu').html('');
    var list = d3.selectAll('.d3-kegg-menu').append('ul');
    list.selectAll('li').data(menu).enter()
      .append('li')
      .html(function(d) {
        return (typeof d.title === 'string') ? d.title : d.title(data);
      })
      .on('click', function(d, i) {
        d.action(elm, data, index);
        d3.select('.d3-kegg-menu').style('display', 'none');
      });

    // the openCallback allows an action to fire before the menu is displayed
    // an example usage would be closing a tooltip
    if (openCallback) openCallback(data, index);

    // display kegg menu
    d3.select('.d3-kegg-menu')
      .style('left', (d3.event.pageX - 2) + 'px')
      .style('top', (d3.event.pageY - 2) + 'px')
      .style('display', 'block');

    d3.event.preventDefault();
  };
};