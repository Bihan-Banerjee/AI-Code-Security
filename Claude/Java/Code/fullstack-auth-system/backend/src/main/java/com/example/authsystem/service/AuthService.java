package com.example.authsystem.service;

import com.example.authsystem.dto.*;
import com.example.authsystem.entity.User;
import com.example.authsystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class AuthService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final FileStorageService fileStorageService;
    
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }
        
        String token = jwtService.generateToken(user.getEmail());
        return new LoginResponse(token, user.getEmail(), "Login successful");
    }
    
    public LoginResponse register(RegisterRequest request, MultipartFile profileImage) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }
        
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setPhoneNumber(request.getPhoneNumber());
        user.setBio(request.getBio());
        
        if (profileImage != null && !profileImage.isEmpty()) {
            String fileName = fileStorageService.storeFile(profileImage);
            user.setProfileImage(fileName);
        }
        
        userRepository.save(user);
        
        String token = jwtService.generateToken(user.getEmail());
        return new LoginResponse(token, user.getEmail(), "Registration successful");
    }
    
    public UserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getBio(),
                user.getProfileImage()
        );
    }
}