d3.json("data.json").then(function(data) {
    createPieChart("allocationPie", data)
    createTable("symbolsTable", data)
})

// https://www.d3-graph-gallery.com/graph/donut_label.html
function createPieChart(id, data) {
    const typePieData = data.reduce(function(res, curr) {
        res[curr.Type] ? res[curr.Type] += curr.Cost : res[curr.Type] = curr.Cost
        return res
    }, {})

    const width = 600
    const height = 400
    const radius = 200

    const svg = d3.select("#" + id)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    const color = d3.scaleOrdinal()
        .range(d3.schemeDark2);

    const pie = d3.pie()
        .sort(null) // Do not sort group by size
        .value(function(d) {return d.value; })

    const data_ready = pie(d3.entries(typePieData))
    const arc = d3.arc()
        .innerRadius(radius * 0.3)
        .outerRadius(radius * 0.8)
    // label arc
    const outerArc = d3.arc()
        .innerRadius(radius * 0.9)
        .outerRadius(radius * 0.9)

    svg.selectAll('allSlices')
        .data(data_ready)
        .enter()
        .append('path')
        .attr('d', arc)
        .attr('fill', function(d) { return(color(d.data.key)) })
        .attr("stroke", "white")
        .style("stroke-width", "5px")
        .style("opacity", 0.8)

    svg.selectAll('allPolylines')
        .data(data_ready)
        .enter()
        .append('polyline')
        .attr("stroke", "black")
        .style("fill", "none")
        .attr("stroke-width", 1)
        .attr('points', function(d) {
            const posA = arc.centroid(d) // line insertion in the slice
            const posB = outerArc.centroid(d) // line break: we use the other arc generator that has been built only for that
            const posC = outerArc.centroid(d); // Label position = almost the same as posB
            const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2 // we need the angle to see if the X position will be at the extreme right or extreme left
            posC[0] = radius * 0.95 * (midangle < Math.PI ? 1 : -1); // multiply by 1 or -1 to put it on the right or on the left
            return [posA, posB, posC]
        })

    svg.selectAll('allLabels')
        .data(data_ready)
        .enter()
        .append('text')
        .text( function(d) {return d.data.key } )
        .attr('transform', function(d) {
            var pos = outerArc.centroid(d);
            var midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
            pos[0] = radius * 0.99 * (midangle < Math.PI ? 1 : -1);
            return 'translate(' + pos + ')';
        })
        .style('text-anchor', function(d) {
            const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
            return (midangle < Math.PI ? 'start' : 'end')
        })
}

function createTable(id, data) {
    const columns = ["Symbol", "Cost %", "Type"]
    const symbolTableData = data.reduce(function(res, curr) {
        const sum = data.reduce(function(sum, curr) {
            return sum + curr.Cost
        }, 0)
        const curr_symbols = res.map(r => r.Symbol)
        if (curr_symbols.includes(curr.Symbol)) {
            const row = res.find( ({ Symbol }) => Symbol === curr.Symbol)
            row["Cost"] += (curr.Cost * 100 / sum)
            row["Cost %"] = row["Cost"].toFixed(2)
            row["Type"] = curr.Type
        }
        else {
            const row = {}
            row["Symbol"] = curr.Symbol
            row["Cost"] = (curr.Cost * 100 / sum)
            row["Cost %"] = row["Cost"].toFixed(2)
            row["Type"] = curr.Type
            res.push(row)
        }
        return res
    }, [])

    const table = d3.select('#' + id).append('table')
    table.append('thead')
        .append('tr')
        .selectAll('th')
        .data(columns)
        .enter()
        .append('th')
        .text(function (column) { return column });

    const rows = table.append('tbody')
        .selectAll('tr')
        .data(symbolTableData)
        .enter()
        .append('tr')
    rows.selectAll('td')
        .data(function (row) {
            return columns.map(function (column) {
                return {column: column, value: row[column]};
            });
        })
        .enter()
        .append('td')
        .text(function (d) { return d.value; })

    rows.sort(function (a, b) {
        return b.Cost - a.Cost
    })

    return table;
}
