package com.example.authapp.service;

import com.example.authapp.dto.AuthResponseDto;
import com.example.authapp.dto.LoginDto;
import com.example.authapp.dto.RegisterDto;
import com.example.authapp.model.Role;
import com.example.authapp.model.Role.RoleName;
import com.example.authapp.model.User;
import com.example.authapp.repository.RoleRepository;
import com.example.authapp.repository.UserRepository;
import com.example.authapp.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.UUID;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtil jwtUtil;

    @Value("${file.upload-dir}")
    private String uploadDir;

    public String registerUser(RegisterDto registerDto, MultipartFile profilePic) throws IOException {
        if (userRepository.existsByUsername(registerDto.getUsername())) {
            throw new RuntimeException("Username is already taken!");
        }
        if (userRepository.existsByEmail(registerDto.getEmail())) {
            throw new RuntimeException("Email is already registered!");
        }

        User user = new User();
        user.setUsername(registerDto.getUsername());
        user.setEmail(registerDto.getEmail());
        user.setPassword(passwordEncoder.encode(registerDto.getPassword()));
        user.setBio(registerDto.getBio());
        user.setPhoneNumber(registerDto.getPhoneNumber());

        // Handle profile picture upload
        if (profilePic != null && !profilePic.isEmpty()) {
            String fileName = UUID.randomUUID().toString() + "_" + profilePic.getOriginalFilename();
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            Path filePath = uploadPath.resolve(fileName);
            Files.copy(profilePic.getInputStream(), filePath);
            user.setProfilePicPath("/uploads/" + fileName); // Store relative path
        }

        Role roles = roleRepository.findByName(RoleName.ROLE_USER)
                .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
        user.setRoles(Collections.singleton(roles));

        userRepository.save(user);
        return "User registered successfully!";
    }

    public AuthResponseDto loginUser(LoginDto loginDto) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginDto.getEmail(), // Authenticate by email
                        loginDto.getPassword()
                )
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String token = jwtUtil.generateToken(authentication);
        return new AuthResponseDto(token);
    }
}
