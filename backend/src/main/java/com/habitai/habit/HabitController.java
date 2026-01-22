package com.habitai.habit;

import com.habitai.habitlog.HabitLogService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/habits")
public class HabitController {

    private final HabitService habitService;
    private final HabitLogService habitLogService;

    public  HabitController(HabitService habitService,  HabitLogService habitLogService) {
        this.habitService = habitService;
        this.habitLogService = habitLogService;
    }

    @GetMapping("/all")
    @ResponseStatus(HttpStatus.OK)
    public List<HabitDTO> getAllHabits() {
        return habitService.getAllHabits();
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<HabitResponse> getHabitsForDate(@RequestParam(required = false) LocalDate date) {
        date = ( date == null ) ? LocalDate.now() : date;
        return habitService.getHabitsForDate(date);
    }

    @GetMapping("/{habitId}")
    @ResponseStatus(HttpStatus.OK)
    public HabitDTO getHabitById(@PathVariable long habitId) {
        return habitService.getHabitById(habitId);
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
        habitLogService.deleteByHabitId(habitId);
        return ResponseEntity.noContent().build();
    }
}
