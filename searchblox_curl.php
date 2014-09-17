<?php defined('ABSPATH') or die("Direct Access Not Allowed!");

/*
 Core curl function for SearchBlox plugin
 Version: 0.1
 Author: SearchBlox 
 Author URI: http://searchblox.com
*/
function searchblox_curl_request( $url , $xml_input = ''  ) {
    $error_count = 0 ;
	global $wp_version ; 
	$response = wp_remote_post( $url, 
	array(
	'method' => 'POST',
	'timeout' => 10,
	'redirection' => 5,
	'httpversion' => '1.0',
	'blocking' => true ,
	'headers' => Array('Content-Type: text/xml'),
	'user-agent'  => 'WordPress/' . $wp_version . '; ' . get_bloginfo( 'url' ),
	'body' => trim($xml_input)
      )
    );
	
 
if ( is_wp_error( $response ) ) {
   $error_message = $response->get_error_message();
   return "Something went wrong: $error_message";
} 
	
	    $body = $response['body'];
		$xml = simplexml_load_string($body);
	    global $statuscode; 
    	$statuscode = (string) $xml->statuscode ;
	   
	    if (intval($statuscode)>=100 AND intval($statuscode)<=701) {
			
			if ( intval($statuscode) == 100 ) {
				$error_count = 0; // After first succesful connection, lets reset error counter 
			}
			else $error_count++; // Skip if document cannot be indexed
		}
		
		elseif ( $statuscode <> '' ) {
			
			$error_count++; // Skip if document cannot be indexed
		}
	
	
        return $error_count; 
}

function searchblox_curl_get_request( $url ) {
    global $wp_version ; 
	$response = wp_remote_get( $url, 
		array(
		'timeout' => 10,
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

       
	return $response = json_decode( $response['body'] ) ; 

}