<?php defined('ABSPATH') or die("Direct Access Not Allowed!");

/*
 Description : These are the Functions Which Interact With the API of the SearchBlox Application
 Author URI: http://www.searchblox.com
*/



/*
 * Creates a Test Collection to verify the api key . 
 * 
 * 
 */


	function searchblox_test_create( $api_key  , $location) {
			 
		$url = $location . ':8080/searchblox/api/rest/coladd'; 
		$collection_name = "test" ; 

		$xml_input = '<?xml version="1.0" encoding="utf-8"?>
		<searchblox apikey="'.$api_key .'">
		<document colname="'.$collection_name.'">
		</document>
		</searchblox>' ; 


		searchblox_curl_request( $url , $xml_input ) ; 
		global $statuscode; 
	   
		$step_verify = false ;
		switch($statuscode) {
		  case 901:    // Collection already created , on a Free edition , api verified.
			$step_verify = true ; 
			break;
		  case 601:    // Entered API not Correct 
			$step_verify = false ;		
			add_action( 'admin_notices', 'searchblox_apikey_warning');
			break;
		  case 900:    // Collection successfully created , api verified. 
			$step_verify = true ;   //delete this test collection	
			searchblox_delete_collection( $api_key , $collection_name , $location ) ;  	
			break;	
		  default:     // Requested URL not correct
		  $step_verify = false ;
		  add_action( 'admin_notices', 'searchblox_path_warning');
		  break ; 	  
		}	
		
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

		$url = SEARCHBLOX_LOCATION . ':8080/searchblox/api/rest/clear';
		searchblox_curl_request( $url , $xml_input ) ; 
		global $statuscode;

		if($statuscode == 500) {
			return false ;  // Invalid Collection 
		} else {
			return true ; 
		}
	}



/*
 * Handles the APi Form Data
 * 
 * 
 */

	function searchblox_handle_api_form( $api_form ) { 
		
	   $api_key   =  sanitize_text_field( $api_form['apikey'] ) ; 
	   $location =   esc_url ( rtrim( $api_form['location'] , "/ " ) ) ; 
	   
		$resp = searchblox_test_create( $api_key , $location ) ;  // Test API and Installation Path.   
	   if($resp == true ) { 
	   
			update_option( 'searchblox_apikey', $api_key);
			update_option( 'searchblox_location', $location);
			
			// Now Proceed to the next step   
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
				update_option( 'searchblox_collection', $collection ); // Now Proceed to the next step  

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
		
		$api_key                        =  get_option('searchblox_apikey') ; 
		$collection_name                =  get_option('searchblox_collection') ; 
		$location                       =   get_option('searchblox_location') ;         
	 
		searchblox_delete_collection( $api_key , $collection_name , $location  ) ; 
	}


/*
 * Deletes A Collection 
 * 
 */
 
	function searchblox_delete_collection( $api_key , $collection_name , $location  ) {

		$xml_input = '
					<?xml version="1.0" encoding="utf-8"?>
					<searchblox apikey="'.$api_key.'">
					<document colname="'.$collection_name.'">
					</document>
					</searchblox>
					' ; 
		$url = $location . ':8080/searchblox/api/rest/coldelete';
		searchblox_curl_request( $url , $xml_input ) ; 
		global $statuscode ; 
		
		   // 800 , Collection deleted Successfully!
		delete_option('searchblox_apikey') ; 
		delete_option('searchblox_collection') ; 
		delete_option('searchblox_location') ; 

		   
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
		$num_written = 0 ;
		$query_limit =  $batch_size ; 
		$results = array() ;
		global $wpdb;
		$latest_post_ID = get_option( "searchblox_last_ID" );
		$results = $wpdb->get_results( $wpdb->prepare(
			"SELECT * FROM $wpdb->posts WHERE ID > %d
									   AND post_status='publish' AND (post_type='post' OR post_type='page') ORDER BY ID LIMIT 
									   %d OFFSET %d " ,
			$latest_post_ID  , $query_limit  , $offset
		));


		$total_posts = count( $results ) ; 
	   
		if( $total_posts > 0 ) {
			try {
				foreach ( $results as $result ) {

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
							$categories .= '<category>' . $category->cat_ID . '</category>'; 
						}
					}
                     
					$xml_input = searchblox_xml_form( $result , $categories ) ; 

					$url = SEARCHBLOX_LOCATION . ':8080/searchblox/api/rest/add';
                   
					$error_count = searchblox_curl_request( $url , $xml_input ) ; 
				   
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
	 
		header( 'Content-Type: application/json' );
		if( ! isset( $error ) ) {
			
		$response = array( 'num_written' => $num_written, 'total' => $total_posts ); 
		print( json_encode( $response ) );
			
		} else {
			
			 print( json_encode( $error ) );
		}
	   
		die();

	}