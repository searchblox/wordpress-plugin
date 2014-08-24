  function shuffle(items)
  {
      var cached = items.slice(0), temp, i = cached.length, rand;
      while(--i)
      {
          rand = Math.floor(i * Math.random());
          temp = cached[rand];
          cached[rand] = cached[i];
          cached[i] = temp;
      }
      return cached;
  } 
 function shuffleNodes(list)
  {
      var nodes = list.children, i = 0;
      nodes = Array.prototype.slice.call(nodes);
      nodes = shuffle(nodes);
      while(i < nodes.length)
      {
          list.appendChild(nodes[i]);
          ++i;
      }
  }

  jQuery(document).ready(function($) {
	
  $('.facet-view-simple').facetview({
    
    facets: [
        //{'field': 'language', 'display': 'Language'},
		//{'field': 'title', 'display': 'Headlines'},
        //{'field': 'contenttype', 'display': 'File Type'},
        {'field': 'keywords',  'display': 'Keywords'},
        {'field': 'colname','display': 'Collection'},
    ]
  });
});