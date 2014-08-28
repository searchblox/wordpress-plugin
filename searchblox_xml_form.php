<?php defined('ABSPATH') or die("Direct Access Not Allowed!");

function searchblox_xml_form( $result = '' , $categories = '' , $existing_tags = ''   ) {
	
	$url_location = get_permalink( $result->ID );
	if (substr($url_location,-1)!= "/") { 
		$url_location .= "/";
	}
	$lm_date = date('d F Y h:i:s T' ,strtotime($result->post_modified));
	
	$existing_tags = rtrim( $existing_tags , ',') ; 

	return $xml_input='<?xml version="1.0" encoding="utf-8"?>
				<searchblox apikey="'.searchblox_check_apikey().'">
				<document colname="' . SEARCHBLOX_COLLECTION . '" location="' . $url_location . '">
				<url>' . $url_location . '</url>
				<lastmodified>' . $lm_date . '</lastmodified>
				<title boost="1">' . searchblox_sanitize( $result->post_title ) . '</title>
				<keywords boost="1">' . $existing_tags . '</keywords>
				<content boost="1">' .  searchblox_sanitize( $result->post_title ) . " " . searchblox_sanitize( $result->post_content ) . '</content>
				<description boost="1">' . searchblox_description( $result->post_content ) . '</description>

				<size>'.(2*strlen( $result->post_content )).'</size>
				<alpha></alpha>
				<contenttype>HTML</contenttype>
				'.$categories.'
				</document>
				</searchblox>
				';
}	