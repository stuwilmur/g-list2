var ccolor = "economy";
var c;
var c2;
var width = 1500;
var height = 450;
var margin = ({top: 20, right: 20, bottom: 35, left: 100})
let mapped = new Map();
var countries;

function dataAt(year){
  var res = mapped.filter(function(d) {return d.year == year})
  if (res.length > 0)
  {
	return res[0].data.map(recomputedata);
  }
}

function deNaN(x)
{
	return isNaN(x) ? 0 : x;
}

var x = d3.scaleLog([2, 1e5], [margin.left, width - margin.right])

function fy(range){return d3.scaleLinear(range, [height - margin.bottom, margin.top])}

var radius = d3.scaleSqrt([0, 5e8], [0, width / 30])

var colorscale = d3.scaleOrdinal(["LIC", "LMC", "UMC", "HIC"], d3.schemeCategory10)

function xAxis(g)
{
	return g.attr("transform", `translate(0,${height - margin.bottom})`)
	.call(d3.axisBottom(x).ticks(width / 80, ","))
	.call(g => g.select(".domain").remove())
	.call(g => g.append("text")
		  .attr("x", width)
		  .attr("y", margin.bottom - 4)
		  .attr("fill", "currentColor")
		  .attr("text-anchor", "end")
		  .text("Government revenue per capita (USD)"))
}
	  
var fyAxis = function(ay, annotation){
  return g => g
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(ay))
    .call(g => g.select(".domain").remove())
    .call(g => g.append("text")
          .attr("x", -margin.left)
          .attr("y", 10)
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .text(annotation))}

fgrid = function(ay){
  return g => g
    .attr("stroke", "currentColor")
    .attr("stroke-opacity", 0.1)
    .call(g => g.append("g")
          .selectAll("line")
          .data(x.ticks())
          .join("line")
          .attr("x1", d => 0.5 + x(d))
          .attr("x2", d => 0.5 + x(d))
          .attr("y1", margin.top)
          .attr("y2", height - margin.bottom))
    .call(g => g.append("g")
          .selectAll("line")
          .data(ay.ticks())
          .join("line")
          .attr("y1", d => 0.5 + ay(d))
          .attr("y2", d => 0.5 + ay(d))
          .attr("x1", margin.left)
          .attr("x2", width - margin.right));}
		  
function labelText(d, quantity){
  return [d.name, "population: " + d3.format(",.9r")(d.population), 
          "gov. rev. per cap. : $" + d3.format(",.5r")(d.govRevCap),
          quantity + ": " + d[quantity].toFixed(2)].join("\n");
}

function recomputedata(d){
  var e = { ...d }
  var computed = computeResult(e, "mortality");
  e.mortality = computed[0];
  var computed2 = computeResult(e, "matMortality");
  e.matmortality = computed2[0];
  var computedRev = getRevenue(d, method);
  e.govRevCap = computedRev[3];
  e.show = d.govRevCap > 0;
  e.info = makeText(d);
  return e;
}

function load(datalist) {
	
  var data = datalist[0];		
		
  var countriesnested = d3.nest()
  .key(function(d) { return d.year; })
  .entries(data);
  
  countries = d3.nest()
  .key(function(d) { return d.countryname; })
  .entries(data)
  .map(d => d.key)
  //.filter(d => d.length > 0)
  .sort()
  .map(function(d) {return {properties : {name : d}}});
  
  mapped = countriesnested.map( function(d,id){
  var obd = {year : +d.key, 
             data : d.values.map( function(e,ie){
               var obe = {
                 year : +d.key,
                 name:  e.countryname, 
                 iso : e.countrycode,  
                 id : ie,  
                 economy : e.incomelevel,
                 population : +e["Population, total"], 
                 birthRate : +e["Birth rate, crude (per 1,000 people)"],
                 govRevCap : +e.GOVREVPERCAP, 
                 //u5deaths : +e.U5DEATHS, 
                 //u5Pop : +e.U5POP, 
                 //births : +e.BIRTHS, 
                 //matdeaths : +e.MATDEATHS, 
                 mortality : +e.U5M, 
                 matMortality : +e.MMR}
               return obe;
             })}
  return obd;
  ; })
    
  console.log(mapped);
  
  c = chart(svg, "mortality", [0,300], "Under-5 mortality (per 1000 births)");
  c2 = chart(svg2, "matmortality", [0,1500], "Maternal mortality (per 100,000 births)");
  
  setupMenus(countries);
  updateKey();

}

function displaycircle(d, measure)
{
  if (d.name.trim() == country
  || (country == "$-ALL")
  || (country == "$-HIC" && d.economy == "HIC")
  || (country == "$-UMIC" && d.economy == "UMC")
  || (country == "$-LMIC" && d.economy == "LMC")
  || (country == "$-LIC" && d.economy == "LIC")
  )
  {
	  if (d.show && !isNaN(d[measure]))
		return "block";
  }
  return "none";
}

function getstroke(d)
{
  var ret = d.name.trim() == country ? 2 : 0.5;
  return ret;
}

function updateKey()
{
	var ordinal = d3.scaleOrdinal(["LIC", "LMIC", "UMIC", "HIC"], d3.schemeCategory10)
	
	var legendOrdinal = d3.legendColor()
    .shape("path", d3.symbol().type(d3.symbolCircle).size(150)())
    .shapePadding(10)
	.cellFilter(function(d){ return d.label !== "e" })
	.scale(ordinal)
	.title("Legend");
	
	svg.select(".legendOrdinal")
   .call(legendOrdinal)
   .attr("display", ccolor == "economy" ? "block" : "none");
}

function loadfile()
{
	var files = ["GRADE-Mortality%20Dec%202020.csv"];
	var promises = [];

	files.forEach(function(url) {
		promises.push(d3.csv(url))
	});

	Promise.all(promises).then(load);	
}

function chart(thesvg, measure, range, annotation) {
  
  thesvg.append("g")
    .call(xAxis);

  var y = fy(range);

  var yAxis = fyAxis(y, annotation);

  thesvg.append("g")
    .call(yAxis);

  var grid = fgrid(y);

  thesvg.append("g")
    .call(grid);

  const circle = thesvg.append("g")
  .attr("stroke", "black")
  .selectAll("circle")
  .data(dataAt(year), d => d.name)
  .join("circle")
  .sort((a, b) => d3.descending(a.population, b.population))
  .attr("stroke-width", getstroke)
  .attr("cx", d => deNaN(x(d.govRevCap)))
  .attr("cy", d => y(d[measure]))
  .attr("r", d => radius(d.population))
  .style("display", d => displaycircle(d, measure))
  .attr("fill", d => colorscale(d[ccolor]))
  .on("mouseover", mouseover)
  .on("mousemove", mousemove)
  .on("mouseleave", mouseleave)
  //.call(circle => circle.append("title").text(d => labelText(d,measure)));

  return Object.assign(thesvg.node(), {
    update(data) {
      circle.data(data, d => d.name)
        .sort((a, b) => d3.descending(a.population, b.population))
		.attr("stroke-width", getstroke)
        .attr("cx", d => deNaN(x(d.govRevCap)))
        .attr("cy", d => y(d[measure]))
        .attr("r", d => radius(d.population))
        .style("display", d => displaycircle(d, measure))
        .attr("fill", d => colorscale(d[ccolor]))
        //.call(circle => circle.select("title").text(d => labelText(d,measure)));
    }
  });
}

function update()
{
	var datanow = dataAt(year);
	c.update(datanow);
	c2.update(datanow);
	var countrydata = datanow.filter(d => d.name.trim() == country);
	if (countrydata.length > 0)
	{
		var text = countrydata[0].info;
		d3.select("#countrytext").
		html(text);
		d3.select("#countrydata2")
		.style("display", text.length > 0 ? "block" : "none");
	}
	else
	{
		d3.select("#countrydata2").style("display", "none");
	}
	
	updateKey();
}
