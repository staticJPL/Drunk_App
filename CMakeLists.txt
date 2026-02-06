cmake_minimum_required(VERSION 3.16)
project(Drunk_App LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# For clang-tidy/clangd
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# -------------------------
# Options
# -------------------------
option(DRUNK_ENABLE_WARNINGS "Enable extra compiler warnings" ON)

# -------------------------
# Include
# -------------------------
list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_LIST_DIR}/cmake")
include(Sanitizers)

# -------------------------
# Dependencies
# -------------------------
find_package(PkgConfig REQUIRED)
find_package(fmt REQUIRED)
pkg_check_modules(GPIOD REQUIRED IMPORTED_TARGET libgpiod)

# -------------------------
# Target: drunk_app
# -------------------------
add_executable(drunk_app
  source/main.cpp
  source/gpio_bank.cpp
  source/led_controller.cpp
  source/ads1115.cpp
  source/analyzer.cpp
)

target_include_directories(drunk_app PRIVATE ${CMAKE_SOURCE_DIR}/source)
target_link_libraries(drunk_app PRIVATE PkgConfig::GPIOD fmt::fmt atomic)

# Warnings (GCC/Clang)
if(DRUNK_ENABLE_WARNINGS)
  target_compile_options(drunk_app PRIVATE -Wall -Wextra -Wconversion -Wshadow -Wpedantic)
endif()

# Sanitizers (based on -DDRUNK_ENABLE_* options) IE the function call Note to self
drunk_apply_sanitizers(drunk_app)
