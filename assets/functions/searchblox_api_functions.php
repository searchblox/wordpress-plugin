<?php defined('ABSPATH') or die("Direct Access Not Allowed!");

/*
 Description : These are the Functions Which Interact With the API of the SearchBlox Application
 Author URI: http://www.searchblox.com
*/



/*
 * Verify The API Key and Location By A Dummy Request to the APP
 * 
 * 
 */


	function searchblox_verify_api_loc ( $api_key  , $location , $port_no ) {
			 
		$url = $location . ':' . $port_no . '/searchblox/api/rest/status';  // Check the status of a dummy document to verify api key and location. 
		$collection_name = "test" ; 

		$xml_input = '<?xml version="1.0" encoding="utf-8"?>
		<searchblox apikey="'.$api_key .'">
		<document colname="'.$collection_name.'" uid="http://www.searchblox.com/">
		</document>
		</searchblox>' ; 


		searchblox_curl_request( $url , $xml_input ) ; 
		
		global $statuscode; 
		$step_verify = true ;
		
		
		if( $statuscode == 601 ) : 
			$step_verify = false ;		
			add_action( 'admin_notices', 'searchblox_apikey_warning'); // Entered API not Correct 
		
		elseif( empty( $statuscode ) ) : 
			 $step_verify = false ;
			 add_action( 'admin_notices', 'searchblox_path_warning');  // Requested URL not correct
		
		else : 
			$step_verify = true ; 
		
		endif;
		
		return $step_verify ;  
	} 

/*
 * Index a Test document To verify the collection name
 * 
 * 
 */
 
 
	function searchblox_test_collection ( $collection_name = '' ) { 

		$xml_input ='
				<?xml version="1.0" encoding="utf-8"?>
				<searchblox apikey="'.searchblox_check_apikey().'">
				<document colname="'.$collection_name.'" />
				</searchblox>
				';

		$url = SEARCHBLOX_LOCATION. ':' . SEARCHBLOX_PORTNO . '/searchblox/api/rest/clear';
		searchblox_curl_request( $url , $xml_input ) ; 
		global $statuscode;

		if($statuscode == 500) {
			return false ;  // Invalid Collection 
		} else {
			return true ; 
		}
	}



/*
 * Handles the API Form Data
 * 
 * 
 */

	function searchblox_handle_api_form( $api_form ) { 
		
	   $api_key   =  sanitize_text_field( $api_form['apikey'] ) ; 
	   $location  =   esc_url ( rtrim( $api_form['location'] , "/ " ) ) ; 
	   $port_no   =   sanitize_text_field( absint(  $api_form['port_no']  ) )  ;  
	   
		$resp = searchblox_verify_api_loc( $api_key , $location , $port_no  ) ;  // Test API and Installation Path.   
	   if($resp == true ) { 
	   
			update_option( 'searchblox_apikey', $api_key);
			update_option( 'searchblox_location', $location);
			update_option( 'searchblox_portno', $port_no );
		   
		     wp_redirect( searchblox_url() ) ;   // Now Proceed to the next step  
		} 
	}
  

 /*
 * Handles the Collection Form Data
 * 
 * 
 */

	function searchblox_handle_collection_form( $collection_form ) { 
	   
	   $collection = sanitize_text_field ( $collection_form ) ; 
	   $check = SEARCHBLOX_COLLECTION ;   // If Collection name not set  
		if( empty( $check ) ) {
			
		   $resp = searchblox_test_collection ( $collection );

		   if( $resp == true ) {
				update_option( 'searchblox_collection', $collection ); 
			    wp_redirect( searchblox_url() ) ;   // Now Proceed to the next step  
			   
			} else {
				add_action( 'admin_notices', 'searchblox_collection_warning');
			}
		}	
	}

 /*
 * Handles the Re-configure Form 
 * 
 * 
 */

	function searchblox_handle_re_configure_form() { 
		
		$api_key                        =   get_option('searchblox_apikey') ; 
		$collection_name                =   get_option('searchblox_collection') ; 
		$location                       =   get_option('searchblox_location') ;  
		
		// Clear the collection 
		$xml_input = '
					<?xml version="1.0" encoding="utf-8"?>
					<searchblox apikey="'.$api_key.'">
					<document colname="'.$collection_name.'">
					</document>
					</searchblox>
					' ; 
		$url = $location. ':' . SEARCHBLOX_PORTNO . '/searchblox/api/rest/clear';
		searchblox_curl_request( $url , $xml_input ) ; 
		global $statuscode ; 
	
		
			delete_option('searchblox_apikey') ; 
			delete_option('searchblox_collection') ; 
			delete_option('searchblox_location') ; 
		    delete_option('searchblox_portno') ;
		    delete_option('searchblox_search_collection') ; 
		    delete_option('searchblox_indexed') ; 
		   
		    wp_redirect( searchblox_url() ) ;   // Now Back to the first step
	
	}


/*
 * FUNCTIONS WHICH IS ASSOCIATED WITH AJAX CALLS FOR INDEXING FROM SB ADMIN 
 */



/*
 * Index a batch of posts
 */



	function searchblox_index_batch_of_posts() { 

		check_ajax_referer( 'searchblox-ajax-nonce' );
		$offset = isset( $_GET['offset'] ) ? intval( $_GET['offset'] ) : 0;
		$batch_size = isset( $_GET['batch_size'] ) ? intval( $_GET['batch_size'] ) : 4;
		$resp = NULL;
        $error_count = 0 ; 
		$num_written = 0 ;
		$query_limit =  $batch_size ; 
		$results = array() ;
		global $wpdb;
		$results = $wpdb->get_results( $wpdb->prepare(
			"SELECT * FROM $wpdb->posts WHERE  post_status='publish' AND (post_type='post' OR post_type='page') ORDER BY ID LIMIT 
									   %d OFFSET %d " , $query_limit  , $offset
		));


		$total_posts = count( $results ) ; 
	   
		if( $total_posts > 0 ) {
			try {
				foreach ( $results as $result ) {

					$error_count = searchblox_index_doc( $result ) ;  
				   
					global $statuscode ; 
					
					if( $statuscode == 502 )   // Invalid Document Location
					{
						throw new Exception("SearchBlox could not find the requested documents on this location.");
					}	
					
					if ( $error_count == 0 ) { 
						$num_written++;
					} else  {
					
						 throw new Exception("Documents could not be indexed. Please Try again !");
						 return ; 
					}
				}
				
			} catch ( Exception $e ) { 
				
				$error = array(
					'error' => $e->getMessage()
					) ; 
					
			}
			
		} else {
			$num_written = 0;
		}
	 
		
		if( ! isset( $error )  && ( $error_count == 0 ) ) {
			//If indexing successful , then set variable

			if( ! get_option ('searchblox_indexed') ) {
				update_option('searchblox_indexed' , 1 ) ; 
			}	   

		} 
		
		header( 'Content-Type: application/json' );
		if( ! isset( $error ) ) {
			
			$response = array( 'num_written' => $num_written, 'total' => $total_posts ); 	
			print( json_encode( $response ) );
			
		} else {
			
			 print( json_encode( $error ) );
		}
	   
		die();

	}
	
 /*
 * Indexs the DOC in SearchBlox APP 
 * 
 */

	function searchblox_index_doc( $result ) {
	
        //Find the tags and make them keywords
		$posttags = get_the_tags( $result->ID );
		$existing_tags = "";
		if ($posttags) {
			foreach($posttags as $tag) {
				$existing_tags .= $tag->name . ', '; 
			}
		}
		$existing_tags = rtrim( $existing_tags, ", " ); 

		//Find the categories	
		$postcategory = get_the_category( $result->ID );
		$categories = "";
		if ($postcategory) {
			foreach( $postcategory as $category ) {
				$categories .=   '<category>' . $category->cat_name . '</category>' ; 
			}
		}
		 
		$xml_input = searchblox_xml_form( $result , $categories , $existing_tags ) ; 

		$url = SEARCHBLOX_LOCATION. ':' . SEARCHBLOX_PORTNO . '/searchblox/api/rest/add';
	    
		$error_count = searchblox_curl_request( $url , $xml_input ) ;

        return $error_count ; 

	}


	
/*
 * Creates index for the recently saved post
 * @triggers on action 'edit_post' Or 'publish_post'
 * 
 */
	function searchblox_trigger_index( $post_ID ) {
		
		// Check if Settings configured
		if ( searchblox_config_check() ) { 

			$result = get_post( $post_ID );
			$post_status = $result->post_status;
			
			if ( $post_status  != 'publish' ) return; // If not published, do nothing. We only index published posts.
		
			$error_count = searchblox_index_doc( $result ) ;
			
		}
	}
	
	
/*
 * Deletes post from collection 
 * @triggers on action 'delete_post'
 * 
 */
	
	function searchblox_trigger_delete( $post_ID ) {
	 
		// Check if Settings configured
		if ( searchblox_config_check() ) {
		  
			$result = get_post( $post_ID );
			
			$xml_input ='
				<?xml version="1.0" encoding="utf-8"?>
				<searchblox apikey="'.searchblox_check_apikey().'">
				<document colname="'.SEARCHBLOX_COLLECTION.'" uid="' . get_permalink( $result->ID ) . '"/>
				</searchblox>
				';
				
				$url = SEARCHBLOX_LOCATION. ':' . SEARCHBLOX_PORTNO . '/searchblox/api/rest/delete';
				
				$error_count = searchblox_curl_request( $url , $xml_input ) ;
		}
	
	}