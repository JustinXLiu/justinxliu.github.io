files = ["../data/12_1_23.json", "../data/12_1_24.json", "../data/3_14_25.json"]

Promise.all(files.map(file => d3.json(file))).then(dataArray => {
    const processedData = dataArray.map((data, index) => {
        const timestamp = files[index].split('/').pop().split('.')[0]
        const formattedDate = new Date(timestamp.replace(/_/g, '/')).toLocaleDateString()

        const totalCost = d3.sum(data, d => d.Cost)
        const totalActual = d3.sum(data, d => d.Actual)

        const categories = {
            "Index": { Cost: 0, Actual: 0 },
            "Stock": { Cost: 0, Actual: 0 },
            "Cash+Bond": { Cost: 0, Actual: 0 },
            "Crypto": { Cost: 0, Actual: 0 }
        };

        data.forEach(d => {
            if (d.Type === "Index" || d.Type === "Stock") {
                categories[d.Type].Cost += d.Cost
                categories[d.Type].Actual += d.Actual
            }
            if (d.Type === "Cash" || d.Type === "Bond") {
                categories["Cash+Bond"].Cost += d.Cost
                categories["Cash+Bond"].Actual += d.Actual
            }
            if (d.Type === "Crypto") {
                categories["Crypto"].Cost += d.Cost
                categories["Crypto"].Actual += d.Actual
            }
        })

        return {
            timestamp: formattedDate,
            "Index Cost": Math.round((categories["Index"].Cost / totalCost) * 100),
            "Stock Cost": Math.round((categories["Stock"].Cost / totalCost) * 100),
            "Cash Cost": Math.round((categories["Cash+Bond"].Cost / totalCost) * 100),
            "Index Actual": Math.round((categories["Index"].Actual / totalActual) * 100),
            "Stock Actual": Math.round((categories["Stock"].Actual / totalActual) * 100),
            "Cash Actual": Math.round((categories["Cash+Bond"].Actual / totalActual) * 100),
            "Crypto Cost": Math.round((categories["Crypto"].Cost / totalCost) * 100),
            "Crypto Actual": Math.round((categories["Crypto"].Actual / totalActual) * 100)
        }
    })
    createGroupedBarChart(processedData, false, "#costAllocationTimeSeriesChart")
    createGroupedBarChart(processedData, true, "#actualAllocationTimeSeriesChart")
})

function createGroupedBarChart(data, isActual, outputId) {
    const margin = { top: 100, right: 100, bottom: 100, left: 100 }
    const width = window.innerWidth * 0.7 - margin.left - margin.right
    const height = window.innerHeight * 0.7 - margin.top - margin.bottom

    const svg = d3.select(outputId)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)

    const x = d3.scaleBand()
        .domain(data.map(d => d.timestamp))
        .range([0, width])
        .padding(0.2)

    const y = d3.scaleLinear()
        .domain([0, 100])
        .nice()
        .range([height, 0])

    var types = []
    if (isActual) {
        types = ["Index Actual", "Stock Actual", "Cash Actual", "Crypto Actual"]
    }
    else {
        types = ["Index Cost", "Stock Cost", "Cash Cost", "Crypto Cost"]
    }
    const color = d3.scaleOrdinal()
        .domain(types)
        .range(d3.schemeCategory10)

    const stack = d3.stack()
        .keys(types)
    const stackedData = stack(data)

    const groups = svg.append("g")
        .selectAll("g")
        .data(stackedData)
        .enter().append("g")
        .attr("fill", d => color(d.key));

    groups.selectAll("rect")
        .data(d => d)
        .enter().append("rect")
        .attr("x", d => x(d.data.timestamp))
        .attr("y", d => y(d[1])) // Y position is the top of the stack for each segment
        .attr("height", d => Math.abs(y(d[0]) - y(d[1])))
        .attr("width", x.bandwidth());

    // Append text elements to display the percentage value
    groups.selectAll("text")
        .data(d => d)
        .enter().append("text")
        .attr("x", d => x(d.data.timestamp) + x.bandwidth() / 2)
        .attr("y", d => y(d[1]) + (y(d[0]) - y(d[1])) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .style("fill", "white")
        .text(d => `${(d[1] - d[0])}%`);


    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))

    svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y).ticks(5))

    // Add legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 20}, 0)`)


    const legendKeys = [
        { name: "Index Fund", key: "Index" + (isActual ? " Actual" : " Cost") },
        { name: "Individual Stocks", key: "Stock" + (isActual ? " Actual" : " Cost") },
        { name: "Cash & Bonds", key: "Cash" + (isActual ? " Actual" : " Cost") },
        { name: "Cryptocurrency", key: "Crypto" + (isActual ? " Actual" : " Cost") }
    ];

    legend.selectAll("rect")
        .data(legendKeys)
        .enter().append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 20)
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", d => color(d.key))

    legend.selectAll("text")
        .data(legendKeys)
        .enter().append("text")
        .attr("x", 24)
        .attr("y", (d, i) => i * 20 + 9)
        .attr("dy", "0.35em")
        .text(d => d.name)
}