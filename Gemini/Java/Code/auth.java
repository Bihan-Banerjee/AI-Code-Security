package com.example.authapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;

@SpringBootApplication
public class AuthappApplication {

    public static void main(String[] args) {
        // Create uploads directory if it doesn't exist
        String uploadDir = System.getenv("UPLOAD_DIR"); // Get from .env
        if (uploadDir == null) {
            uploadDir = "uploads/profile_pics"; // Fallback if .env not loaded or variable not set
        }
        File uploadFolder = new File(uploadDir);
        if (!uploadFolder.exists()) {
            uploadFolder.mkdirs();
        }
        SpringApplication.run(AuthappApplication.class, args);
    }

    // Configure CORS for the frontend
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**") // Apply to all API endpoints
                        .allowedOrigins("http://localhost:3000") // Allow frontend origin
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true);
            }
        };
    }
}
