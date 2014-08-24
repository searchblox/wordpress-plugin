<?php defined('ABSPATH') or die("Direct Access Not Allowed!");
 
if ( ! current_user_can( 'activate_plugins' ) )
        return;
    check_admin_referer( 'bulk-plugins' );


//if uninstall not called from WordPress exit
if ( !defined( 'WP_UNINSTALL_PLUGIN' ) ) 
    exit();

$option_name = array ( 'searchblox_apikey'  , 'searchblox_location' , 'searchblox_collection' ) ;

foreach($option_name as $option) {
	
	delete_option( $option );
  
	// For site options in multisite
	if ( is_multisite() ) {
		delete_site_option( $option );
	
	} 
}