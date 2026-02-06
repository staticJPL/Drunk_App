# cmake/Sanitizers.cmake
#
# Provides:
#   - Options: DRUNK_ENABLE_ASAN/UBSAN/TSAN/MSAN
#   - Function: drunk_apply_sanitizers(<target>)

# -------------------------
# Options
# -------------------------
option(DRUNK_ENABLE_ASAN  "Enable AddressSanitizer" OFF)
option(DRUNK_ENABLE_UBSAN "Enable UndefinedBehaviorSanitizer" OFF)
option(DRUNK_ENABLE_TSAN  "Enable ThreadSanitizer" OFF)
option(DRUNK_ENABLE_MSAN  "Enable MemorySanitizer (Clang only, special toolchain usually required)" OFF)

# -------------------------
# Sanitizer validation
# -------------------------
# TSan must be alone
if(DRUNK_ENABLE_TSAN AND (DRUNK_ENABLE_ASAN OR DRUNK_ENABLE_UBSAN OR DRUNK_ENABLE_MSAN))
  message(FATAL_ERROR "TSan cannot be combined with ASan/UBSan/MSan. Use a separate build directory.")
endif()

# If enabling TSan, enforce Clang requirement (though Pi2 armv7 won't support it anyway)
if(DRUNK_ENABLE_TSAN AND NOT CMAKE_CXX_COMPILER_ID MATCHES ".*Clang")
  message(FATAL_ERROR "TSan build must use Clang (set -DCMAKE_CXX_COMPILER=clang++). Current: ${CMAKE_CXX_COMPILER_ID}")
endif()

# MSan must be alone and requires Clang
if(DRUNK_ENABLE_MSAN)
  if(NOT CMAKE_CXX_COMPILER_ID MATCHES ".*Clang")
    message(FATAL_ERROR "MSan requires Clang. Current compiler: ${CMAKE_CXX_COMPILER_ID}")
  endif()
  if(DRUNK_ENABLE_ASAN OR DRUNK_ENABLE_UBSAN)
    message(FATAL_ERROR "MSan cannot be combined with ASan/UBSan. Use a separate build directory.")
  endif()
  message(WARNING "MSan enabled: requires MSan-instrumented runtime/libs; often not practical on Raspberry Pi OS.")
endif()

# Helper to apply sanitizer flags to a target
function(drunk_apply_sanitizers target)
  if(NOT (CMAKE_CXX_COMPILER_ID STREQUAL "GNU" OR CMAKE_CXX_COMPILER_ID MATCHES ".*Clang"))
    return()
  endif()

  set(SANITIZERS "")

  if(DRUNK_ENABLE_ASAN)
    list(APPEND SANITIZERS address)
  endif()
  if(DRUNK_ENABLE_UBSAN)
    list(APPEND SANITIZERS undefined)
  endif()
  if(DRUNK_ENABLE_TSAN)
    list(APPEND SANITIZERS thread)
  endif()
  if(DRUNK_ENABLE_MSAN)
    list(APPEND SANITIZERS memory)
  endif()

  if(SANITIZERS)
    list(JOIN SANITIZERS "," LIST_OF_SANITIZERS)

    # armv7 + ASan register pressure mitigation
    if(DRUNK_ENABLE_ASAN)
      target_compile_options(${target} PRIVATE -O1 -g -fno-inline)
    endif()

    target_compile_options(${target} PRIVATE
      -fsanitize=${LIST_OF_SANITIZERS}
      -fno-omit-frame-pointer
    )
    target_link_options(${target} PRIVATE
      -fsanitize=${LIST_OF_SANITIZERS}
      -fno-omit-frame-pointer
    )

    if(DRUNK_ENABLE_UBSAN)
      target_compile_options(${target} PRIVATE -fno-sanitize-recover=all)
    endif()
  endif()
endfunction()
