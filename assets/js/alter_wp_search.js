jQuery(document).ready(function( $ ) {
	
	var searchform = $("input[name='s']").length; 
	if( searchform ) { // IF Search Form Exists
		var query ;
		var search_field = $("input[name='s']") ;
		
		$( "input[name='s']" ).autocomplete({ }) ;   // Decalre Auto Complete Function	
		$("input[name='s']").attr("autocomplete","off") ; 
        search_field.keyup( function() {
		
		query = $(this).val().trim() ; 
		if( query ) {  
			$( "input[name='s']" ).autocomplete({ 
				source: function( request, response ) { 
						$.ajax({
							type: "get",
							url: searchblox_vars.admin_url,
							data: {
								action:   'wp_search_auto_suggest',
								mydata:  'q='+ query ,
								_ajax_nonce : searchblox_vars._ajax_nonce
							},
 					success: function( data ) {
				       
						var temp = [];
						if( data ) {

							try {
								var mydata = jQuery.parseJSON(data) ; 
								if (mydata && typeof mydata === "object" && mydata !== null) {
									for(var i in mydata){
										temp.push(mydata[i]);
									}

								}
							}
							catch (e) { console.log(e) ;  }
							var is_array = $.isArray( temp ) ; 
							if( temp.length>=1 && is_array ) { 
								temp = temp[0] ;
								response( temp );
							} else {
								response( [] ) ; // Empty Response if There are no suggests
						    }
			            } 
					} ,error: function(errorThrown){
							console.log(errorThrown);
						}

		              }); 
	            }
		     }); 
		}	
     }).delay(50) ; 
	}
});