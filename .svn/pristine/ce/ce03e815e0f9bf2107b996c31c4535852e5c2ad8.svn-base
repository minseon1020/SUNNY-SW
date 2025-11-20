package com.future.my.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebRoutingConfig implements WebMvcConfigurer {

	@Override
	public void configurePathMatch(PathMatchConfigurer configurer) {
		// Use AntPathMatcher to support legacy pattern syntax for SPA fallbacks
		configurer.setPatternParser(null);
	}

	@Override
	public void addViewControllers(ViewControllerRegistry registry) {
		registry.addViewController("/")
				.setViewName("forward:/index.html");

		registry.addViewController("/{spring:(?!api$|error$)[^\\.]*}")
				.setViewName("forward:/index.html");

		registry.addViewController("/**/{spring:(?!api$)[^\\.]*}")
				.setViewName("forward:/index.html");
	}

}

