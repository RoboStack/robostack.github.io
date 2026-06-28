document$.subscribe(function() {
  var tables = document.querySelectorAll("article table")
  tables.forEach(function(table) {
    var footer = table.createTFoot();
    table.rows[table.rows.length-1].setAttribute("data-sort-method", "none");
    footer.appendChild(table.rows[table.rows.length-1])

    new Tablesort(table);
  })
})
