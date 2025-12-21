package com.habitai.habit;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/habits")
public class HabitController {

    private final HabitService habitService;

    public  HabitController(HabitService habitService) {
        this.habitService = habitService;
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<HabitDTO> getAllHabits(){
        return habitService.getAllHabits();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public HabitDTO createHabit(@Valid @RequestBody HabitRequest habitRequest){
        return habitService.createHabit(habitRequest);
    }

    @PutMapping("/{habitId}")
    public ResponseEntity<Void> updateHabit(@PathVariable long habitId, @Valid @RequestBody HabitRequest habitRequest){
        habitService.updateHabit(habitId, habitRequest);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{habitId}")
    public ResponseEntity<Void> deleteHabit(@PathVariable Long habitId){
        habitService.deleteHabit(habitId);
        return ResponseEntity.noContent().build();
    }
}
