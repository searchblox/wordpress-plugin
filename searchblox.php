<?php defined('ABSPATH') or die("Direct Access Not Allowed!");

/*
 Plugin Name: SearchBlox
 Plugin URI: http://www.searchblox.com
 Description: Adds SearchBlox search functionality to WordPress websites. Indexes whole website to be searched easily.
 Version: 0.4
 Author: SearchBlox Software, Inc.
 Author URI: http://www.searchblox.com
 License: GPLv2
*/

/*
This program is free software; you can redistribute it and/or modify 
it under the terms of the GNU General Public License as published by 
the Free Software Foundation; version 2 of the License.

This program is distributed in the hope that it will be useful, 
but WITHOUT ANY WARRANTY; without even the implied warranty of 
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the 
GNU General Public License for more details. 
*/


///////// ***********************  INITIAL SETTINGS  ******************************  ////////////


		$platform                =  searchblox_check_platform() ; 
		$collection              =  sanitize_text_field ( get_option( 'searchblox_collection' )  ) ; 
		$location                =  sanitize_text_field ( rtrim( get_option( 'searchblox_location' ) , "/") ) ; 
		$api_key     			 =  sanitize_text_field ( get_option( 'searchblox_apikey' ) )  ;
        $port_no     			 =  sanitize_text_field ( get_option( 'searchblox_portno' ) ) ; 
		
		define( 'PLUGIN_FULL_PATH', WP_PLUGIN_URL .'/'. str_replace(basename( __FILE__), "", plugin_basename(__FILE__) ) );
		define( 'MENU_PAGE', "http://".$_SERVER['SERVER_NAME'] . $_SERVER['PHP_SELF']. '?page=searchblox_settings');
		define( 'PLATFORM' , $platform ); // Windows or Linux
		define( 'SEARCHBLOX_COLLECTION', $collection );
		define( 'SEARCHBLOX_LOCATION', $location );
		define( 'SEARCHBLOX_APIKEY', $api_key );
		define('SEARCHBLOX_PORTNO' , $port_no ) ;  // Assumed Port No.
		
		if ( is_admin() ) {
			include_once( ABSPATH . 'wp-includes/pluggable.php' ); //Hack for wp_get_current_user fatal error.
			require_once( 'assets/functions/searchblox_helper_functions.php' );
			require_once( 'assets/functions/searchblox_api_functions.php' );
			include_once( 'searchblox_curl.php' ); // Curl file
			include_once( 'searchblox_xml_form.php' ); //Xml form 
			
			
			searchblox_initial_settings() ;  // Initial Settings for my plugin
		}



	register_activation_hook( __FILE__, 'searchblox_on_activation' );

	function searchblox_on_activation()
	{
		if ( ! current_user_can( 'activate_plugins' ) )
			return;
		$plugin = isset( $_REQUEST['plugin'] ) ? $_REQUEST['plugin'] : '';
		check_admin_referer( "activate-plugin_{$plugin}" );

	}


	register_deactivation_hook( __FILE__, 'searchblox_on_deactivation' ); 

	function searchblox_on_deactivation()
	{
		if ( ! current_user_can( 'activate_plugins' ) )
			return;
		$plugin = isset( $_REQUEST['plugin'] ) ? $_REQUEST['plugin'] : '';
		check_admin_referer( "deactivate-plugin_{$plugin}" );
	
	}

/*
 * Checks if server is Windows or Linux 
 * 
 * 
 */
	function searchblox_check_platform() {
	
		if ( stripos( $_SERVER['SERVER_SOFTWARE'] , "Win" ) !==false ) { 
		   return 'windows';
		} else { 
		  return 'linux';
		}  
    }
	
	
/*
 * Initial function to set menu 
 * 
 * 
 */

	function searchblox_admin_init() {
		
		add_menu_page( 'SearchBlox' , 'SearchBlox' , 'manage_options' , 'SearchBlox' , 'searchblox_admin_page' ,  PLUGIN_FULL_PATH . 'assets/images/searchblox-logo-menu.png' );
		
		add_submenu_page( 'SearchBlox' , 'SearchBlox' , 'Search Collection' , 'manage_options' , 'search_collection' , 'searchblox_show_collections' ); 
		
		if ( empty( $GLOBALS['wp_rewrite'] ) ) : 
			$GLOBALS['wp_rewrite'] = new WP_Rewrite();
		endif ;
	}


/**
* CALL FRONTEND CLASS FOR FRONTEND HANDLING
*
*
**/

	   
//// ACTIONS FOR FRONTEND /////

	include_once('searchblox_class_frontend.php');   
	$searchblox_frontend = new Searchblox_frontend();	

//// ACTIONS FOR FRONTEND ///// 



	   
///////// ***************** END OF INITIAL SETTINGS********************************** /////////////
     

/*
 * Builds Admin Panel Window 
 * 
 * 
 */
 
	function searchblox_admin_page() { 

		$api_authorized                       =  get_option( 'searchblox_apikey' );
		$collection_initialized               =  get_option( 'searchblox_collection' );
		$location                             =  get_option( 'searchblox_location'); 
		$port_no                              =  get_option( 'searchblox_portno'); 

		if( $api_authorized && $location && $port_no  ) {
			if( $collection_initialized ) {
				include_once ( 'assets/pages/searchblox_full_page.php'); 
			} else {
				include_once ( 'assets/pages/searchblox_collection_page.php'); 
			}
		} else { 
			include_once ( 'assets/pages/searchblox_api_page.php') ; 
		}
	}

/*
 * Shows Collection Details Page in the Admin Section
 * 
 * 
 */

	function searchblox_show_collections() {
		
		if( ! SEARCHBLOX_APIKEY   ||  ! SEARCHBLOX_COLLECTION ||  ! SEARCHBLOX_LOCATION || ! SEARCHBLOX_PORTNO  ) {
			
		 echo '<div class="error fade"><p><b>[SearchBlox]</b> Searchblox settings not configured.</p></div>' ;
		 return ; 
		} 
		
		$url = SEARCHBLOX_LOCATION. ':' . SEARCHBLOX_PORTNO . '/searchblox/servlet/SearchServlet?&query=""&xsl=json' ; 
		
	    $response = searchblox_curl_get_request( $url ) ;
	    $collections  = array() ; 
	    $collections = $response->searchform->collections ;
	   
		if( empty( $collections ) ) { 
		
		  searchblox_admin_header();  //Show admin header
		  echo '<div class="error fade"><p><b>[SearchBlox]</b> You have created no collections yet.</p></div>';
		  return ; 
		}     
		 // If collections are there then show the page to show collections // 
		 
		include_once ( 'assets/pages/searchblox_search_collection_page.php');  
	 
	}


/*
 * Handles Backend Form Submit Actions
 * 
 * 
 */

if( is_admin() ) { 

	if( isset($_POST['submit_api']) || isset( $_POST['submit_collection']) || isset ($_POST['submit_re_configure']) ) { 
	
	   if( ! check_admin_referer( 'searchblox_nonce', 'searchblox_nonce_field' ) ) 
	   return ;
	
	   if ( isset( $_POST['submit_api'] )  && isset( $_POST['sb_form'] ) ) {
			
			searchblox_handle_api_form ( $_POST['sb_form'] ) ; 
	    }
		if (  isset( $_POST['submit_collection'] ) && isset( $_POST['searchblox_collection'] )  ) {
			
			if( ! empty( $_POST['searchblox_collection'] ) ) { 
				searchblox_handle_collection_form (  $_POST['searchblox_collection']  ); 
			} else {
				add_action( 'admin_notices', 'searchblox_collection_warning');
			}
		}
		if (  isset( $_POST['submit_re_configure'] ) && isset( $_POST['searchblox_clear'] ) ) {
			
			 searchblox_handle_re_configure_form();
		}
		
	} 
}