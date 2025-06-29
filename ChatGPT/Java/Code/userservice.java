package com.example.auth.service;

import com.example.auth.model.User;
import com.example.auth.repository.UserRepository;
import com.example.auth.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public void registerUser(String email, String password, String bio, String phone, MultipartFile profileImage) {
        String hashedPw = passwordEncoder.encode(password);
        String imagePath = null;

        if (profileImage != null && !profileImage.isEmpty()) {
            String uploadDir = "uploads/";
            new File(uploadDir).mkdirs();
            imagePath = uploadDir + profileImage.getOriginalFilename();
            try {
                profileImage.transferTo(new File(imagePath));
            } catch (IOException e) {
                throw new RuntimeException("File upload failed");
            }
        }

        User user = new User();
        user.setEmail(email);
        user.setPassword(hashedPw);
        user.setBio(bio);
        user.setPhone(phone);
        user.setProfileImage(imagePath);

        userRepository.save(user);
    }

    public String loginUser(String email, String password) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty() || !passwordEncoder.matches(password, userOpt.get().getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }
        return jwtUtil.generateToken(email);
    }
}
