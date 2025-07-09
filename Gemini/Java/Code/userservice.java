package com.example.authapp.service;

import com.example.authapp.dto.UserDto;
import com.example.authapp.exception.ResourceNotFoundException;
import com.example.authapp.model.User;
import com.example.authapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    public UserDto getUserProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

        UserDto userDto = new UserDto();
        userDto.setId(user.getId());
        userDto.setUsername(user.getUsername());
        userDto.setEmail(user.getEmail());
        userDto.setProfilePicPath(user.getProfilePicPath());
        userDto.setBio(user.getBio());
        userDto.setPhoneNumber(user.getPhoneNumber());
        userDto.setRoles(user.getRoles().stream().map(role -> role.getName().name()).collect(Collectors.toSet()));

        return userDto;
    }
}
