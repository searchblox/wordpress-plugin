<?php defined('ABSPATH') or die("Direct Access Not Allowed!");

/**
* CLASS FOR MANAGING FRONTEND SEARCH HANDLING
*
* 
*/

if ( ! class_exists( 'Searchblox_frontend' ) ) {
	
	
	class Searchblox_frontend { 
        
		private $show_posts   = false  ; // Saves Post ID of posts from search results from searchblox
		private $collection   = SEARCHBLOX_COLLECTION ; 
		private $location     = SEARCHBLOX_LOCATION ; 
		private $api_key      = SEARCHBLOX_APIKEY ; 
		static $add_script    =  false ;   
		private $is_search    =  false ;


		public function __construct() {  

			add_action(  'pre_get_posts', array( $this , 'searchblox_get_result'  )); // Get Result for the query
			add_action(  'init', array( $this , 'register_script'));
			add_action(  'wp_footer', array(  $this , 'enqueue_scripts')  );
			add_action ( 'wp_footer' , array ( $this , 'enqueue_script_search')) ;

			add_action('wp_ajax_nopriv_wp_search_auto_suggest', array( $this , 'wp_search_auto_suggest') );
			add_action('wp_ajax_wp_search_auto_suggest', array( $this , 'wp_search_auto_suggest') );

			add_action('wp_ajax_nopriv_searchblox_auto_suggest', array( $this , 'searchblox_auto_suggest') );
			add_action('wp_ajax_searchblox_auto_suggest', array( $this , 'searchblox_auto_suggest') );

			add_filter('the_posts',    array( $this , 'searchblox_filter_search' ));  // Filter search according to query
			add_shortcode('searchblox_search', array( $this , 'searchblox_search') );
		}


		/**
			* Get search results from the SEARCHBLOX API
			* Retrieves search results from the SEARCHBLOX API based on the user-input text query.
			* @param WP_Query $wp_query The query for this request.
			*/	

		public function searchblox_get_result( $wp_query ) {

			$this->is_search = false ; // If search query is not made by the plugin then do'not modify post results 

			if( function_exists( 'is_main_query' ) && ! $wp_query->is_main_query() ) {
				return;
			}

			if( (!is_search()) || empty ( $this->api_key ) ||  empty ( $this->collection ) ||  empty ( $this->location ) ) {
			 return ; 
			}

			$query = urlencode( sanitize_text_field( $wp_query->query['s'] ) ) ;  
			$collection_col =  $this->get_collection_ids() ; 
			$url = SEARCHBLOX_LOCATION. ':' . SEARCHBLOX_PORTNO . '/searchblox/servlet/SearchServlet?&query='. $query .
										 '&xsl=json&'. $collection_col  ; 
			$response = $this->searchblox_curl_get_request( $url ) ;

			if( $this->isJson( $response ) ) {

				$response = json_decode( $response ) ; 
			} else {

				$response = false ; 
			}

			if( empty ($response->results->result) ) :
				$this->is_search = true; // A search query is made , but no results found. 
				return ; 
			endif ;

			$posts  = array() ; 
			$collected_posts = array() ;
			$posts = $response->results->result ; 
			$obj = new stdClass() ;


			if(is_array($posts)) {
				foreach( $posts as $post ) { 
					$post_obj = $this->get_post_object ( $post->uid );
					if( $post_obj == FALSE ) :    // IF POST OBJECT NOT SET 
						$obj->post_title   = ($post->title) ? $post->title : NULL ;
						$obj->post_content = ($post->description) ? $post->description : NULL ;
						$collected_posts[] = $obj ; 
					else : 
						$collected_posts[] = $post_obj ; 
					endif ;  
				} 
			} else {
				$post_obj = $this->get_post_object ( $posts->uid );
				if( $post_obj == FALSE ) :   // IF POST OBJECT NOT SET 
					$obj->post_title   = ($posts->title) ? $posts->title : NULL ;
					$obj->post_content = ($posts->description) ? $posts->description : NULL ;
					$collected_posts[] = $obj ; 
				else : 
					$collected_posts[] = $post_obj ; 
				endif ; 
			}

			$this->show_posts = $collected_posts ; 
			$this->is_search = true; // A search query is successfull , show results from API

		}	

		/**
			* Get posts from the database in the order dictated by the Searchblox API
			*
			* Apply the correct ordering to the posts retrieved in the main query, based on results from the Searchblox API.
			* Called by the the_posts filter.
			*
			* @param array $posts the posts ordered as they are when they are originally retrieved from the database
			*/	

		public function searchblox_filter_search( $posts ) {


			if( (!is_search()) ||  empty ( $this->api_key ) ||  empty ( $this->collection ) ||  empty ( $this->location ) ) {
					return $posts;
			}

			if( $this->is_search  == false ) :  // If search query is not made by the plugin then do'not modify post results 
				return $posts ; 
			else : 

				if( empty ( $this->show_posts ) ):
					return NULL ;
				else : 
					return $this->show_posts ; 
				endif; 
			endif ;



			//die('asas') ;


		}



		public function isJson($string) {
			 json_decode($string);
			 return (json_last_error() == JSON_ERROR_NONE);
		}



		public function searchblox_curl_get_request( $url ) {

			global $wp_version ; 
			$response = wp_remote_get( $url, 
				array(
				'timeout' => 15,
				'redirection' => 5,
				'httpversion' => '1.0',
				'blocking' => true ,
				'headers' => Array(),
				'user-agent'  => 'WordPress/' . $wp_version . '; ' . get_bloginfo( 'url' ),
				)
			);

			if ( is_wp_error( $response ) ) {
			   $error_message = $response->get_error_message();
			   return "Something went wrong: $error_message";
			}  

			if( $this->isJson( $response['body'] ) ) :
				return  $response['body']  ; 
			else :
				return null ; 
			endif ;

		}

		/**
		* HELPER FUNCTION TO FECTH POST OBJECT THROUGH UID FROM SEARCHBLOX APP
		*/	

		public function get_post_object( $uid ) { 

			$findme   = site_url();
			$pos = strpos($uid, $findme); 

			// POST NOT FROM THIS WEBSITE // 
			if( $pos === FALSE) :
			  return NULL ; 
			endif ; 

			$url =   esc_url ( $uid ) ;
			$url = str_replace( site_url() .'/' , '' , $url ) ; 
			$slug = rtrim ( $url , '/' );

			global $wpdb;
			$post = $wpdb->get_row( 
							   $wpdb->prepare
							   ( "SELECT ID FROM $wpdb->posts WHERE post_name = %s AND 
							   ( post_type = 'post' OR post_type = 'page')" , $slug
							   ) , OBJECT 
							); 

			$post_id =  $post->ID  ;

			if(!empty($post_id)) {

				$post_obj = get_post( $post_id , OBJECT ) ; // fetch post object
				return $post_obj ; 
			} else { 
				return NULL ; 
			} 	 
		}



		/*
		 * auto_suggest FRONTEND AJAX CALL TO THIS FUNCTION BY THE SHORTCODE SEARCH
		 * 
		 *
		 */

		public function searchblox_auto_suggest()  {

			check_ajax_referer( 'searchblox-ajax-nonce' );

			 $mydata = sanitize_text_field( $_GET['mydata']) ;
			 $collection_col =  $this->get_collection_ids() ;
			 $url = SEARCHBLOX_LOCATION. ':' . SEARCHBLOX_PORTNO . '/searchblox/servlet/AutoSuggest' ."?". $mydata . '&'. $collection_col; 

			if(! empty( $mydata ) &&  ( !empty($url) ) ) { 
				$resp = array () ; 
				$resp = $this->searchblox_curl_get_request( $url )  ; 
				if( ! empty ( $resp ) ) : 
					echo $resp ; 
				else : 
					echo NULL ; 
				endif; 

			}

			die();	
		}

		/**
		* AJAX RESPONSE FROM DEFAULT WP SEARCH AND RETURN RESULTS OF AUTO SUGGESTS
		*/

		public function wp_search_auto_suggest() {

			check_ajax_referer( 'searchblox-ajax-nonce' );
			 $limit = '4' ; 
			 $mydata = sanitize_text_field( $_GET['mydata']) ;
			 $collection_col =  $this->get_collection_ids() ;
			 $url = SEARCHBLOX_LOCATION. ':' . SEARCHBLOX_PORTNO . '/searchblox/servlet/AutoSuggest' ."?". $mydata . '&limit='. $limit . '&'. $collection_col; 

			if(! empty( $mydata ) &&  ( !empty($url) ) ) { 
				$resp = array () ; 
				$resp = $this->searchblox_curl_get_request( $url )  ; 

			   if( ! empty ( $resp ) ) : 
					echo $resp ; 
				else : 
					echo NULL ; 
				endif ; 

			}

			die();	
		}


		/**
		* CALLBACK FUCNTION FOR SHORTCODE [searchblox_search]
		*/	

		public function searchblox_search() {

			self::$add_script = true ; // Add scripts on shortocde page only 	
			$nonce = wp_create_nonce( 'searchblox-ajax-nonce' );  
			$pp =  PLUGIN_FULL_PATH ; // pp: Short form for plugin path


			$content = '<div class="container" style="vertical-align:middle">
						<div class="facet-view-simple"></div>
						</div>';

			 return $content ; 

		}

		public function register_script() {

			//// REGISTER SCRIPTS ////
			wp_register_script('bootstrap.min', plugins_url( 'vendor/bootstrap/js/bootstrap.min.js', __FILE__ ));
			wp_register_script('jquery.min', plugins_url('vendor/jquery/jquery-1.11.1.min.js', __FILE__ ), '', '1.11.1' , TRUE);
			wp_register_script('jquery.linkify', plugins_url( 'vendor/linkify/1.0/jquery.linkify-1.0-min.js', __FILE__ ) , array( 'jquery'), '1.0' , TRUE);
			wp_register_script('jquery-ui-custom.js', plugins_url( 'vendor/jquery-ui-1.11.1.custom/jquery-ui.min.js', __FILE__ ) , array( 'jquery') , '1.11.1' , TRUE);
			wp_register_script('moment.js', plugins_url( 'vendor/moment.js', __FILE__ ) , '', '' , TRUE);
			wp_register_script('cookie.js', plugins_url( 'vendor/cookie.js', __FILE__ ) , '', '' , TRUE);
			wp_register_script('pretty_photo.js', plugins_url( 'vendor/jquery.prettyPhoto.js', __FILE__ ) , array('jquery'), '' , TRUE);
			wp_register_script('json2extension.js', plugins_url( 'vendor/json2extension.js', __FILE__ ) , '', '' , TRUE);
			wp_register_script('jquery.tagcloud.js', plugins_url( 'vendor/tagcloud/jquery.tagcloud.js', __FILE__ ) , array('jquery'), '' , TRUE);
			wp_register_script('facetview.js', plugins_url( 'assets/js/jquery.facetview.js', __FILE__ ) , '', '' , TRUE);
			wp_register_script('facetview-additional.js', plugins_url( 'assets/js/facetview-additional.js', __FILE__ ) , 
			array('facetview.js'), '' , TRUE );
			wp_register_script('alter_wp_search.js', plugins_url( 'assets/js/alter_wp_search.js', __FILE__  ) );
			//// REGISTER SCRIPTS ////



			//// REGISTER STYLES ////
			wp_register_style('bootstrap.min.css', plugins_url( 'vendor/bootstrap/css/bootstrap.min.css', __FILE__ ) );
			wp_register_style('jquery-ui-custom.css', plugins_url( 'vendor/jquery-ui-1.11.1.custom/jquery-ui.min.css', __FILE__ , '', '1.1.11' , TRUE ));
			wp_register_style('facetview.css', plugins_url( 'assets/css/facetview.css', __FILE__  , '', '' , TRUE ));
			wp_register_style('searchblox-style.css', plugins_url( 'assets/css/style.css', __FILE__  , '', '' , TRUE ));
			wp_register_style('pretty_photo.css', plugins_url( 'assets/css/prettyPhoto.css', __FILE__  , '', '' , TRUE ));
			wp_register_style('searchblox_wp_search.css', plugins_url( 'assets/css/searchblox_wp_search.css', __FILE__  , '', '' , TRUE ));
			//// REGISTER STYLES ////


		}

		public function enqueue_scripts() {

			if (  ! self::$add_script )
			return;

			if( ! wp_script_is( 'jquery', $list = 'enqueued' ) ) {
				wp_enqueue_script('jquery.min');
			}
			if( ! wp_script_is( 'bootstrap.min', $list = 'enqueued' ) ) {
				wp_enqueue_script('bootstrap.min');
			}

			if( ! wp_script_is( 'jquery-ui-custom.js', $list = 'enqueued' ) ) {
				 wp_enqueue_script('jquery-ui-custom.js');
			}


			//// ENQUEUE STYLES ////

			if( ! wp_style_is( 'bootstrap.min.css', $list = 'enqueued' ) ) {
				wp_enqueue_style('bootstrap.min.css'); 
			}


			wp_enqueue_style('facetview.css');
			wp_enqueue_style('searchblox-style.css');
			wp_enqueue_style('pretty_photo.css');


			if( ! wp_style_is( 'jquery-ui-custom.css', $list = 'enqueued' ) ) {
			  wp_enqueue_style('jquery-ui-custom.css');
			}
			//// ENQUEUE STYLES ////



			//// ENQUEUE SCRIPTS ////
			wp_enqueue_script('jquery.linkify');
			wp_enqueue_script('moment.js');
			wp_enqueue_script('cookie.js');
			wp_enqueue_script('pretty_photo.js');
			wp_enqueue_script('json2extension.js');
			wp_enqueue_script('jquery.tagcloud.js');
			// Script which shows are search page , Localize the script to pass dynamic values 
				$nonce = wp_create_nonce( 'searchblox-ajax-nonce' );  // Ajax Nonce
				$pp =  PLUGIN_FULL_PATH ; // pp: Short form for plugin path


				wp_enqueue_script('facetview.js');
				wp_localize_script('facetview.js', 'facetview_vars', array(
					'search_url' 	       => __
					( SEARCHBLOX_LOCATION. ':' . SEARCHBLOX_PORTNO . '/searchblox/servlet/SearchServlet' ) ,
					'search_collection_ids' => __ ( $this->get_collection_ids() ) , 
					'admin_url' 		   => __ (  admin_url('admin-ajax.php') )	,
					'auto_suggest'         => __ 
					( SEARCHBLOX_LOCATION. ':' . SEARCHBLOX_PORTNO . '/searchblox/servlet/AutoSuggest' ),
					'report_servlet'       => __ 
					( SEARCHBLOX_LOCATION. ':' . SEARCHBLOX_PORTNO . '/searchblox/servlet/ReportServlet'), 
					'plugin_path'          => __( $pp ) , 
					'_ajax_nonce'          => __ ( $nonce )
					)
				);

			// Script which shows are search page , Localize the script to pass dynamic values 

			wp_enqueue_script('facetview-additional.js');
			//// ENQUEUE SCRIPTS ////

		}

		/*
		 * Script to Include Auto complete in WP Default Search. 
		 * 
		 * 
		 */
		public function enqueue_script_search() { 

			if( ! wp_script_is( 'jquery', $list = 'enqueued' ) ) {
				wp_enqueue_script('jquery.min');
			}

			if( ! wp_script_is( 'jquery-ui-custom.js', $list = 'enqueued' ) ) {
			  wp_enqueue_script('jquery-ui-custom.js');
			}

			if( ! wp_style_is( 'jquery-ui-custom.css', $list = 'enqueued' ) ) {
			  wp_enqueue_style('jquery-ui-custom.css');
			}

			if( ! wp_style_is( 'facetview.css', $list = 'enqueued' ) ) {
			   wp_enqueue_style('searchblox_wp_search.css'); // Modify WP seacrh style
			}



			$nonce = wp_create_nonce( 'searchblox-ajax-nonce' );  // Ajax Nonce

			wp_localize_script('alter_wp_search.js', 'searchblox_vars', array(

					'admin_url' 		   => __ (  admin_url('admin-ajax.php') )	,
					'_ajax_nonce'          => __ ( $nonce )
					)
				);
			wp_enqueue_script('alter_wp_search.js');

		}

		/*
		 * Get the searchblox_collection id choosen on the search collection page
		 * 
		 * 
		 */

		 public function get_collection_ids() { 

		  $collection_ids = get_option( 'searchblox_search_collection' ) ; 

		  if( empty( $collection_ids ) ) {
			  return NULL ;
			}

		   $collec_col = 'col=' ;
		   $count = 0 ; 
			foreach( $collection_ids as $collection_id ) {
				$collection_id = intval( $collection_id ) ;  
				if( $count == 0 ) {
					$collec_col .= $collection_id ;  
				} else {
					$collec_col .= '&col=' . $collection_id ; 
				}

				$count++ ; 	  
			}

		   return $collec_col ;  

		}	

	} // Class ends here 

} // condition ends here 	