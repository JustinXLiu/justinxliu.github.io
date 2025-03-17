document.getElementById('jsonDropdown').addEventListener('change', function() {
    const selectedFile = this.value
    loadJsonData(selectedFile)
});

// Set a default value and load the corresponding JSON data when the page loads
document.addEventListener('DOMContentLoaded', function() {
    const defaultFile = '../data/3_14_25.json';
    document.getElementById('jsonDropdown').value = defaultFile;
    loadJsonData(defaultFile);
});

function loadJsonData(file) {
    d3.json(file).then(function(data) {
        d3.select("#allocationCostPie").html("") // Clear previous pie chart
        d3.select("#symbolsTable").html("")
        d3.select("#allocationIndexPie").html("")
        d3.select("#allocationStockPie").html("")
        d3.select("#allocationIndexPieActual").html("")
        d3.select("#allocationStockPieActual").html("")

        createPieChart("allocationCostPie", data, null, false)
        createTable("symbolsTable", data, true)
        createPieChart("allocationIndexPie", data, "Index")
        createPieChart("allocationStockPie", data, "Stock")
        createPieChart("allocationIndexPieActual", data, "Index", true)
        createPieChart("allocationStockPieActual", data, "Stock", true)
    });
}

// https://www.d3-graph-gallery.com/graph/donut_label.html
function createPieChart(id, data, type, isActual) {
    if (type != null) {
        data = data.filter(function(d) { 
            return d.Type == type
        })
    }
    const typePieData = data.reduce(function(res, curr) {
        if (isActual) {
            res[curr.Type] ? res[curr.Type] += curr.Actual : res[curr.Type] = curr.Actual
        }
        else {
            res[curr.Type] ? res[curr.Type] += curr.Cost : res[curr.Type] = curr.Cost
        }
        return res
    }, {})
    const symbolPieData = data.reduce(function(res, curr) {
        res[curr.Symbol] = isActual ? curr.Actual : curr.Cost
        return res
    }, {})

    const width = window.innerWidth * 0.5
    const height = window.innerHeight * 0.5
    const radius = Math.min(width, height) * 0.4

    const svg = d3.select("#" + id)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")

    const color = d3.scaleOrdinal()
        .range(d3.schemeDark2)

    const pie = d3.pie()
        .sort(null) // Do not sort group by size
        .value(function(d) {return d.value })

    const data_ready = type == null ? pie(d3.entries(typePieData)) : pie(d3.entries(symbolPieData))
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
            const posC = outerArc.centroid(d) // Label position = almost the same as posB
            const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2 // we need the angle to see if the X position will be at the extreme right or extreme left
            posC[0] = radius * 0.95 * (midangle < Math.PI ? 1 : -1) // multiply by 1 or -1 to put it on the right or on the left
            return [posA, posB, posC]
        })

    svg.selectAll('allLabels')
        .data(data_ready)
        .enter()
        .append('text')
        .text( function(d) {return d.data.key } )
        .attr('transform', function(d) {
            var pos = outerArc.centroid(d)
            var midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
            pos[0] = radius * 0.99 * (midangle < Math.PI ? 1 : -1)
            return 'translate(' + pos + ')'
        })
        .style('text-anchor', function(d) {
            const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
            return (midangle < Math.PI ? 'start' : 'end')
        })
}

function createTable(id, data, showActual = false) {
    const columns = showActual ? ["Symbol", "Cost %", "Actual %", "Type"]
        : ["Symbol", "Cost %", "Type"]
    const symbolTableData = data.reduce(function(res, curr) {
        const cost_sum = data.reduce(function(sum, curr) {
            return sum + curr.Cost
        }, 0)
        const actual_sum = data.reduce(function(sum, curr) {
            return sum + curr.Actual
        }, 0)

        const curr_symbols = res.map(r => r.Symbol)
        if (curr_symbols.includes(curr.Symbol)) {
            const row = res.find( ({ Symbol }) => Symbol === curr.Symbol)
            row["Cost"] += (curr.Cost * 100 / cost_sum)
            row["Cost %"] = row["Cost"].toFixed(2)
            row["Actual"] += (curr.Actual * 100 / actual_sum)
            row["Actual %"] = row["Actual"].toFixed(2)
            row["Type"] = curr.Type
        }
        else {
            const row = {}
            row["Symbol"] = curr.Symbol
            row["Cost"] = (curr.Cost * 100 / cost_sum)
            row["Cost %"] = row["Cost"].toFixed(2)
            row["Actual"] = (curr.Actual * 100 / actual_sum)
            row["Actual %"] = row["Actual"].toFixed(2)
            row["Type"] = curr.Type
            res.push(row)
        }
        return res
    }, [])

    const table = d3.select('#' + id).append('table').attr('class', 'table')
    const thead = table.append('thead')
    const tbody = table.append('tbody')
    // Append the header row
    thead.append('tr')
        .selectAll('th')
        .data(columns)
        .enter()
        .append('th')
        .text(column => column)

    // Create a row for each object in the data
    const rows = tbody.selectAll('tr')
        .data(symbolTableData)
        .enter()
        .append('tr')

    // Create a cell in each row for each column
    rows.selectAll('td')
        .data(row => columns.map(column => ({ column: column, value: row[column] })))
        .enter()
        .append('td')
        .text(d => d.value)

    // Sort rows by Cost
    rows.sort((a, b) => b.Cost - a.Cost)

    return table
}
